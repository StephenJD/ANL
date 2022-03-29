from ast import If
from pathlib import Path
from datetime import datetime, timedelta
import subprocess
# Install deep_translator with: 
# python.exe -m pip install --upgrade pip
# pip install -U deep-translator
from deep_translator import GoogleTranslator
import ctypes
import os
# pip install pywin32 --upgrade
import win32com
from win32com.client import constants
# pip install pandoc
import pypandoc
import mammoth

pandocCmd = "pandoc"
docxToPdfCmd = r"C:\Hugo\docto105\docto"

def Msgbox(title, text, style):
    return ctypes.windll.user32.MessageBoxW(0, str(text), str(title), style)

def readINI() :
  docxRoot = Path.cwd() 
  iniPath = docxRoot / "docxToHugo.toml"
  webRootPath = docxRoot.parent

  sourceLanguage = 'en'
  languages = ['en']
  iniFileHasChanged = True
  if iniPath.exists() :
      iniFileDate = datetime.fromtimestamp(iniPath.stat().st_mtime)
      dateChanged = iniFileDate  - timedelta(seconds=1)
      with iniPath.open('r', encoding="utf-8") as iniFile:
        for line in iniFile:
          line = line.strip()
          if line == "[Hugo Website Root]":
            webRootPath = Path(iniFile.readline().strip('\t\n "\''))
          if line == "[Docx Root]":
            docxRoot = Path(iniFile.readline().strip('\t\n "\''))
          if line == "[Docx Language]":
            sourceLanguage = iniFile.readline().strip('\t\n "\'')
          if line == "[Languages]":
            languages = iniFile.readline().strip('[] \t\n').replace(' ', '').split(',')
          if line == "[DateChanged]":
            try:
              dateChanged = datetime.fromisoformat(iniFile.readline().strip(' \t\n'))
            except Exception:
              pass;     
      iniFile.close()
      if (iniFileDate - dateChanged).total_seconds() > 0:
        iniFileHasChanged = True
      else:  iniFileHasChanged = False              
  if iniFileHasChanged: updateINI(iniPath, webRootPath, docxRoot, sourceLanguage, languages)
  return iniPath, webRootPath, docxRoot, sourceLanguage, languages, iniFileHasChanged

def updateINI(iniFile, webRoot, docxRoot, sourceLanguage, languages):
  with iniFile.open('w', encoding="utf-8") as ini: 
    ini.write("[Hugo Website Root]\n   ")
    ini.write(str(webRoot))    
    ini.write("\n[Docx Root]\n   ")
    ini.write(str(docxRoot))
    ini.write("\n[Docx Language]\n   ")
    ini.write(sourceLanguage)    
    ini.write("\n[Languages]\n   ")
    languages = str(languages).replace("'","")
    languages = languages.replace(" ","")
    ini.write(languages)
    ini.write("\n[DateChanged]\n   ")
    ini.write(str(datetime.now()))

def save_as_docx(word, doc):
  wb = word.Documents.Open(str(doc))
  out_file = doc.with_suffix('.docx')
  print(f"Converting {doc.name} to .docx")
  wb.SaveAs2(str(out_file), FileFormat=16) # file format for docx
  wb.Close()
  doc.unlink()

def haveMadeNewFolder(folder) :
  if not folder.exists():
    folder.mkdir(parents=True)
    return True
  return False

def haveCreatedNewMDindex(mdDestinationPath, language):
  DirectoryName = mdDestinationPath.name
  if DirectoryName == "content" or DirectoryName == language:
    needsIndex = False
  else:
    filePath = mdDestinationPath / "_index.md"
    needsIndex = not filePath.exists()
    if needsIndex:
      with filePath.open('w', encoding="utf-8") as writeFile:
        header = createHeader(DirectoryName, 'document-folder', language)  
        writeFile.write(header)
  return needsIndex

def createMDfolder(mdDestinationPath, language) :
  if haveMadeNewFolder(mdDestinationPath):
    outerFolder = mdDestinationPath
    while haveCreatedNewMDindex(outerFolder, language):
      outerFolder = outerFolder.parent

def fileNeedsUpdating(sourceFile, convertedFile):
  if not sourceFile.exists(): fileOutOfDate = False
  elif convertedFile.exists():
    convertedFileDate = datetime.fromtimestamp(convertedFile.stat().st_mtime)
    sourceFileDate = datetime.fromtimestamp(sourceFile.stat().st_mtime)
    fileOutOfDate = (sourceFileDate - convertedFileDate).total_seconds() > 0
  else:
    fileOutOfDate = True
  return fileOutOfDate

def correctImagePaths(mdFile):
  with mdFile.open('r', encoding="utf-8") as originalfile:
    tempFile = mdFile.parent / 'tempFile.txt'
    with tempFile.open('w', encoding="utf-8") as temp:    
      gotUnclosedImageName = False
      startImageTag = -1
      for line in originalfile:
        if startImageTag == -1: 
          startImageTag = line.find('![')
          if startImageTag >= 0: gotUnclosedImageName = True

        while startImageTag >= 0 :
          if gotUnclosedImageName:
            closeImageName = line.find(']',startImageTag) + 1
            if closeImageName >= 1:
              temp.write(line[:closeImageName].strip('\n'))
              line = line[closeImageName:]            
              gotUnclosedImageName = False
              gotUnclosedBrace = False
              imgPath = ''
            else:
              line = line.strip('\n')
              break
          
          if imgPath == '':
            startImagePath = line.find('(')
            if startImagePath >= 0:
              temp.write(line[:startImagePath].strip('\n'))
              imgPath = '('
              gotUnclosedParen = True
            else:
              line = line.strip('\n')
              break
          
          if gotUnclosedParen:
            startPos = line.find('\\static\\')
            if startPos >= 0:
              startPos += len('\\static')
            else: startPos = 0
            endpos = line.find(')') + 1
            if endpos >= 1:
              imgPath += line[startPos:endpos]
              imgPath = imgPath.replace('\\','/')
              temp.write(imgPath.strip('\n'))
              gotUnclosedParen = False
              line = line[endpos:]
            else:
              imgPath += line[startPos:].strip('\n')
              line = ''
              break

          if line.find('{') >= 0 : 
            gotUnclosedBrace = True
          else:
            startImageTag = line.find('![')
            if startImageTag >= 0: gotUnclosedImageName = True

          if gotUnclosedBrace:
            endBrace = line.find('}') + 1
            if endBrace >= 1: 
              gotUnclosedBrace = False
              line = line[endBrace:]
              startImageTag = line.find('![')  
              if startImageTag >= 0: gotUnclosedImageName = True          
            else:
              line = ''
              break
        # end while
        temp.write(line)
    originalfile.close()
    mdFile.unlink()
    temp.close()
    tempFile.replace(mdFile)

def createMDfile(sourcePath, destPath, name, mediaPath):
  file = destPath / (name + ".md")
  mediaPath = str(mediaPath/name).replace(' ','_')
  if fileNeedsUpdating(sourcePath, file):
    parms = ("-s", "-f", "docx", sourcePath,"-t", "markdown", f"--extract-media={mediaPath}", "-o", file)
    print("Created:", name + ".md")
    #result = mammoth.convert_to_markdown(sourcePath)
    #with file.open('w', encoding="utf-8") as outFile:
      #outFile.write(result.value);
    #outFile.close()
    #pypandoc.convert_file(str(sourcePath), 'markdown', extra_args = f"--extract-media={mediaPath}", outputfile=str(file)) 
    subprocess.run([pandocCmd, *parms], shell=False)
    if not file.exists(): file = False
    else:
      correctImagePaths(file)
  else:
    file = False
  return file

def getDocTitle(mdFile):
  with mdFile.open('r', encoding="utf-8") as file:
    line = file.readline()
    if line.startswith('# '):
        return line[2:]
    else:
      return '¬' + line

def prependToFile(originalfile, string):
    with originalfile.open('r', encoding="utf-8") as original:
      tempFile = originalfile.parent / 'tempFile.txt'
      line = original.readline()
      if not line.startswith('# '):
        original.seek(0)
        string += '\n'

      with tempFile.open('w', encoding="utf-8") as temp: 
        temp.write(string)
        for line in original:
          temp.write(line)
      original.close()
      originalfile.unlink()
      temp.close()
      tempFile.replace(originalfile)

def createHeader (englishTitle, type, language):
  if language != 'en':
    translated = GoogleTranslator(source='en', target=language).translate(text=englishTitle)
  else:
    translated = englishTitle
  contents = "---"
  contents += "\ntitle: " + translated.strip()  
  contents += "\ntype: " + type
  contents += "\ntranslationKey: " + englishTitle.strip() 
  contents += "\ngeometry: margin=2cm"
  contents += "\ngeometry: a4paper"
  #contents += "\noutput: pdf_document"
  #contents += "\npdf_document: null"
  contents += "\n---\n"
  return contents

def createPDF(sourcePath, destPath, name):
  file = destPath / (name + ".pdf")
  if fileNeedsUpdating(sourcePath, file):
    #tempName = sourcePath.replace('c:\\Hugo\\Temp.md')  
    tempPDF = Path('c:\\Hugo\\Temp.pdf')
    fromMD_Parms = ("-f", "markdown", sourcePath,"-t", "pdf", "-o", tempPDF, "--pdf-engine=xelatex" , "--toc", "-V geometry:a4paper", "-V geometry:margin=2cm")
    fromDocxParms = ("-f", sourcePath, "-O", file, "-T", "wdFormatPDF", "-OX", ".pdf")
    print("Created:", file)
    #subprocess.run([docxToPdfCmd, *fromDocxParms], shell=False)
    subprocess.run([pandocCmd, *fromMD_Parms], shell=False) # very slow, and big page boarders
    #tempName.replace(sourcePath)
    tempPDF.replace(file)

def translateBlock(translationBlock, language):
  try:
    translated = GoogleTranslator(source='en', target=language).translate(text=translationBlock)
  except:
    translated = None
  if translated is None:
    translated = translationBlock
  return translated

def createMDtranslation(sourceFile, destPath, name, language):
  destFile = destPath / (name + '.md')
  if fileNeedsUpdating(sourceFile, destFile):
    tempName = destFile.with_suffix('.temp')
    print(f"Translating {name} into {language}")
    with sourceFile.open('r', encoding="utf-8") as original:
      with tempName.open('w', encoding="utf-8") as translation: 
        translationBlock = ''
        blockLength = 0;
        headerCompleted = False;
        for line in original:
          lineLen = len(line)
          if blockLength + lineLen > 4000:
            translated = translateBlock(translationBlock, language)
            print(translated[:10])
            translation.write(translated)
            translationBlock = ""
            blockLength = 0

          imagePos = line.find('![')
          if not headerCompleted:
            if line.startswith('title: '):               
              englishTitle = line[7:]
              translated = translateBlock(englishTitle, language)
              translationBlock += line[:7] + translated + '\n'
            else:
              if blockLength > 5 and line == '---\n' :
                headerCompleted = True
                translation.write(translationBlock)
                translationBlock = ''
                blockLength = 0
              translationBlock += line
              blockLength += lineLen
          elif imagePos >= 0: # image
            while imagePos >= 0:
              translationBlock += line[:imagePos]
              translated = translateBlock(translationBlock, language)
              translationBlock = ""
              translation.write(translated)
              imageEnd = line.find(')',imagePos) + 1
              translation.write(line[imagePos:imageEnd])
              line = line[imageEnd:]
              imagePos = line.find('![')
            translationBlock = line
            blockLength = len(line);
          else:
            translationBlock += line
            blockLength += lineLen

        if len(translationBlock) > 0:
          translated = translateBlock(translationBlock, language)
          translation.write(translated)
        translation.close()
        tempName.replace(destFile)

def updateWebsite(webRootPath):
  ParmsAdd = ("add", ".")
  ParmsCommit = ("commit","-m", "Upload new content")
  ParmsPush = ("push", "origin", "main")
  Git = "git"
  subprocess.run([Git, *ParmsAdd], shell=False, cwd=webRootPath)
  subprocess.run([Git, *ParmsCommit], shell=False, cwd=webRootPath)
  subprocess.run([Git, *ParmsPush], shell=False, cwd=webRootPath)

def deleteRemovedFiles(sourceRootPath, mdRootPath, languages):
  itemsToDelete = []
  for lang in languages:
    mdLangPath = mdRootPath / lang
    langRootStart = len(str(mdLangPath)) + 1   
    for dirItem in mdLangPath.rglob('*'):
      if 'home' in dirItem.parts: continue
      sourceItem = dirItem
      if dirItem.is_file():
        if dirItem.stem.strip('_') == 'index' : continue
        sourceItem = dirItem.parent / (dirItem.stem + '.docx')
      sourcePath = sourceRootPath / str(sourceItem)[langRootStart:]     
      if (sourcePath).exists(): 
        continue
      else:
        msg = f'Item "{dirItem.name}" is missing from {sourceRootPath}\n'
        msg += f'Do you want to delete it from {lang} folder?'
        response = Msgbox("Deleted File", msg, 4)
        if response == 6 :
          itemsToDelete.append(dirItem)
  
  for item in itemsToDelete:
    for subitem in item.rglob('*'): 
      if subitem.is_file(): subitem.unlink()
      elif subitem.is_dir(): item.rmdir()
    if item.is_dir(): item.rmdir()
    elif item.is_file(): item.unlink()     

def checkForUpdatedFiles():
  ini_file, webRootPath, sourceRootPath, sourceLanguage, languages, updated = readINI()
  if updated:
    msg = "Hugo Website root is " + str(webRootPath) + '\n\n'
    msg += "Docx root is " + str(sourceRootPath) + '\n\n'
    msg += "Source Language is: " + sourceLanguage + '\n\n'
    msg += "Languages are: " + str(languages)
    msg += f"\n\nEdit {ini_file.name} to make changes"
    response = Msgbox("docxToHugo_ini.toml", msg, 1)
  
  mdRootPath = webRootPath / "content"
  #pdfRootPath = webRootPath / "static/pdf"

  sourceLanguageMDfolder = mdRootPath / sourceLanguage
  #sourceLanguagePDFfolder = pdfRootPath / sourceLanguage
  sourceRootStart = len(str(sourceRootPath)) + 1
  deleteRemovedFiles(sourceRootPath, mdRootPath, languages)
  docsToConvert = False;
  for sourceDoc in sourceRootPath.rglob('*.doc'):
    if sourceDoc.stem.startswith('~'): continue
    if not docsToConvert:
      docsToConvert = True;
      word = win32com.client.Dispatch("Word.Application")
      word.visible = 0
    save_as_docx(word, sourceDoc)
  
  if docsToConvert:
    word.Quit()
  mediaRoot = webRootPath / "static/media"
  for sourceDoc in sourceRootPath.rglob('*.docx'):
    docName = sourceDoc.stem
    if docName.startswith('~'): continue
    docFolder = str(sourceDoc.parent)[sourceRootStart:]
    # Create sourceLanguage .md files
    sourceLanguageMDpath = sourceLanguageMDfolder / docFolder
    createMDfolder(sourceLanguageMDpath, sourceLanguage)
    mdFile = createMDfile(sourceDoc, sourceLanguageMDpath, docName, mediaRoot/docFolder)
    if mdFile:
      title = getDocTitle(mdFile)
      if title[0] == '¬':
        msg = f'First line of "{docName}" is not Heading 1. It is\n'
        msg += '"' + title[1:] + f'"\n Do you want to use {docName}?'
        response = Msgbox(docFolder, msg, 1)
        if (response == 2):
          mdFile.unlink()
          return
        else: title = docName
      header = createHeader(title, 'document', 'en')    
      prependToFile(mdFile, header)
    sourceLanguageMDfile = sourceLanguageMDpath / (docName + '.md')
    
    # Create English .pdf files
    #englishPDFpath = englishPDFfolder / docFolder
    #haveMadeNewFolder(englishPDFpath)
    #createPDF(sourceLanguageMDfile, englishPDFpath, docName)

    for lang in languages:
      if lang == sourceLanguage: continue
      langMDpath = mdRootPath / lang / docFolder
      createMDfolder(langMDpath, lang)
      createMDtranslation(sourceLanguageMDfile, langMDpath, docName, lang)
 
  updateWebsite(webRootPath)

checkForUpdatedFiles()