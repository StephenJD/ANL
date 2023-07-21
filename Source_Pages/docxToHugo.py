from pathlib import Path
from datetime import datetime
import subprocess # for git
# Install deep_translator with: 
# python.exe -m pip install --upgrade pip
# pip install -U deep-translator
from deep_translator import GoogleTranslator
import ctypes
import os
# pip install --upgrade pywin32 
# pip install --upgrade deepl # get free api key
import win32com
from win32com.client import constants
# pip install pandoc
#import pypandoc
#import mammoth
# pip install aspose.words # $1200 for full version!
#import aspose.words as aw
import deepl

auth_key = "b2937538-9e72-61ff-03f0-e76261dc273a:fx"
translator = deepl.Translator(auth_key)

#pandocCmd = "pandoc"
#docxToPdfCmd = r"C:\Hugo\docto105\docto"
pdf_only_postfix = "_"
toc_tag = "](#"

word = None
word_template = None

# Toml INI files
def readINI() :
  docxRoot = Path.cwd() 
  iniPath = docxRoot / "docxToHugo.toml"
  webRootPath = docxRoot.parent
  dotxTemplate = "LifeForLiberia_Training_Styles.dotx"
  sourceLanguage = 'en'
  languages = ['en']
  dateChanged = True
  if iniPath.exists() :
      iniFileDate = datetime.fromtimestamp(iniPath.stat().st_mtime)
      with iniPath.open('r', encoding="utf-8") as iniFile:
        for line in iniFile:
          line = line.strip()
          if line == "[Hugo Website Root]":
            webRootPath = Path(iniFile.readline().strip('\t\n "\''))
          if line == "[Docx Root]":
            docxRoot = Path(iniFile.readline().strip('\t\n "\''))
          if line == "[Docx Language]":
            sourceLanguage = iniFile.readline().strip('\t\n "\'')
          if line == "[Dotx Template Path]":
            dotxTemplate = iniFile.readline().strip('\t\n "\'')
          if line == "[Languages]":
            languages = iniFile.readline().strip('[] \t\n').replace(' ', '').split(',')
          if line == "[DateChanged]":
            dateChanged = datetime.fromisoformat(iniFile.readline().strip(' \t\n'))     
      iniFile.close()
      if (iniFileDate - dateChanged).total_seconds() > 0:
        dateChanged = True
      else:  dateChanged = False              
  if dateChanged: updateINI(iniPath, webRootPath, docxRoot, dotxTemplate, sourceLanguage, languages)
  return iniPath, webRootPath, docxRoot, dotxTemplate, sourceLanguage, languages, dateChanged

def updateINI(iniFile, webRoot, docxRoot, dotxTemplate, sourceLanguage, languages):
  with iniFile.open('w', encoding="utf-8") as ini: 
    ini.write("[Hugo Website Root]\n   ")
    ini.write(str(webRoot))    
    ini.write("\n[Docx Root]\n   ")
    ini.write(str(docxRoot))
    ini.write("\n[Docx Language]\n   ")
    ini.write(sourceLanguage)    
    ini.write("\n[Dotx Template Path]\n   ")
    ini.write(dotxTemplate)    
    ini.write("\n[Languages]\n   ")
    languages = str(languages).replace("'","")
    languages = languages.replace(" ","")
    ini.write(languages)
    ini.write("\n[DateChanged]\n   ")
    ini.write(str(datetime.now()))

# Windows functions
def Msgbox(title, text, style):
    # Style 0:OK; 1:OK,Cancel; 3:Y/N/Cancel; 4:Y/N
    # Reply: 1:OK; 2:Cancel; 6:Y; 7:N
    return ctypes.windll.user32.MessageBoxW(0, str(text), str(title), style)

# File-system
def sourceDocName(sourcePath):
  sourceDocStart = sourcePath.stem.find('_')
  if sourceDocStart >= 0:
    sourceDocName = sourcePath.stem[sourceDocStart + 1:]
    return sourcePath.parent / (sourceDocName + sourcePath.suffix)
  return Path('')

def pdf_in_md_folder(dirItem):
  if dirItem.suffix != '.pdf' : return False
  md_folder = dirItem.parent.parent
  return list(md_folder.glob(f'{dirItem.stem}_*.md'))

def deleteOldPages(fileList, newestDate):
  if len(fileList) == 0: return
  for file in fileList:
    fileDate = datetime.fromtimestamp(file.stat().st_mtime)
    timeDiff = (newestDate - datetime.fromtimestamp(file.stat().st_mtime)).total_seconds()
    if (newestDate - datetime.fromtimestamp(file.stat().st_mtime)).total_seconds() > 60:
      file.unlink()
   
def deleteRemovedFiles(sourceRootPath, mdRootPath, languages):
  itemsToDelete = []
  folderPages = []
  newestDate = datetime(1900,1,1)
  for lang in languages:
    mdLangPath = mdRootPath / lang
    langRootStart = len(str(mdLangPath)) + 1
    currentDir = None
    for dirItem in sorted(mdLangPath.rglob('*')):
      if 'home' in dirItem.parts: continue   
      if not dirItem.is_file():
        deleteOldPages(folderPages, newestDate)
        newestDate = datetime(1900,1,1)
        folderPages = []
        continue
      if dirItem.stem.strip('_') == 'index' : continue
      if dirItem.stem[0] == '~' : continue
      sourceItem = str(dirItem)[langRootStart:].replace("pdf\\","")        
      sourceItem = sourceItem.replace("_Summary","") 
      sourceItem = sourceItem.replace("_A5_.",".") 
      sourceItem = sourceItem.replace("_A5.",".") 
      sourceItem = sourceItem.replace("_A4_.",".") 
      sourceItem = Path(sourceItem.replace("_A4.","."))         
      sourceItem = sourceItem.parent / (sourceItem.stem + '.docx')
      sourcePath = sourceRootPath / sourceItem    
      if sourcePath.exists(): continue # has a matching .docx
      multiPageDoc = sourceDocName(sourcePath)
      if multiPageDoc.name and multiPageDoc.exists(): # we have found a multi-page source.docx for this .md file
        folderPages.append(dirItem)
        fileDate = datetime.fromtimestamp(dirItem.stat().st_mtime)
        if fileDate > newestDate:
          newestDate = fileDate
        continue
      if pdf_in_md_folder(dirItem): continue
      else:
        msg = f'Item "{dirItem.name}" is missing from {sourceRootPath}\n'
        msg += f'Do you want to delete it from {lang} folder?'
        response = Msgbox("Deleted File", msg, 3)
        if response == 2 : quit()
        if response == 6 : itemsToDelete.append(dirItem)
  
  for item in itemsToDelete:
    for subitem in item.rglob('*'): 
      if subitem.is_file(): subitem.unlink()
      elif subitem.is_dir(): item.rmdir()
    if item.is_dir(): item.rmdir()
    elif item.is_file(): item.unlink()  

def fileNeedsUpdating(sourceFile, pdfFolder):
  fileSearch = f'{sourceFile.stem}*.pdf'
  matchedFiles = tuple(pdfFolder.glob(fileSearch))
  if len(matchedFiles) == 0: return True
  convertedFile = matchedFiles[0]
  if convertedFile.exists():
    convertedFileDate = datetime.fromtimestamp(convertedFile.stat().st_mtime)
    sourceFileDate = datetime.fromtimestamp(sourceFile.stat().st_mtime)
    timeDiff = (sourceFileDate - convertedFileDate).total_seconds() 
    #if timeDiff> 1:
      #stop = True
    fileOutOfDate = timeDiff > 60
  else:
    fileOutOfDate = True
  return fileOutOfDate

def haveMadeNewFolder(folder) :
  if not folder.exists():
    folder.mkdir(parents=True)
    return True
  return False

def createMDfolder(mdDestinationPath, language, sourceLanguage) :
  if haveMadeNewFolder(mdDestinationPath):
    outerFolder = mdDestinationPath
    while haveCreatedNewMDindex(outerFolder, language, sourceLanguage):
      outerFolder = outerFolder.parent

def haveCreatedNewMDindex(mdDestinationPath, language, sourceLanguage):
  DirectoryName = mdDestinationPath.name
  if DirectoryName == "content" or DirectoryName == language:
    needsIndex = False
  else:
    filePath = mdDestinationPath / "_index.md"
    needsIndex = not filePath.exists()
    if needsIndex:
      with filePath.open('w', encoding="utf-8") as writeFile:
        if language == sourceLanguage:
          webFolderName = DirectoryName
        else:
          webFolderName = translateBlock(DirectoryName,language)
        header = create_frontMatter(0, DirectoryName, 'document-folder', webFolderName,"")  
        writeFile.write(header)
  return needsIndex

def addSummaryTo_index(langMDpath, summary):
  # file.truncate() doesn't seem to work!!!
  indexFile = langMDpath/ "_index.md"
  frontMatter = []
  with indexFile.open('r', encoding="utf-8") as read_File:
    frontMatter.append(read_File.readline())
    for line in read_File:
      frontMatter.append(line)
      if line[:3] == '---': break

  with indexFile.open('w', encoding="utf-8") as write_File:
    for line in frontMatter:
      write_File.write(line)

    write_File.write(summary)



def savePageAs_md(page, filePath):
  with filePath.open('w', encoding="utf-8") as md_file: 
    for line in page:
      md_file.write(line)

def file_repair_TOC(lang_file):
  with lang_file.open('r', encoding="utf-8") as original:
      tempFile = lang_file.parent / 'tempFile.txt'
      with tempFile.open('w', encoding="utf-8") as temp: 
        for line in original:
          labelStart, tocStart, tocEnd = toc_pos(line,0)
          if labelStart > 0:
            line = repair_TOC(line, labelStart, tocStart, tocEnd)
          
          temp.write(line)

      original.close()
      lang_file.unlink()
      temp.close()
      tempFile.replace(lang_file)  
  
# General File Modification
charmap = { 0x201c : u"'",
            0x201d : u"'",
            0x2018 : u"'",
            0x2019 : u"'" }
def convertFromSmartQuotes(line):
  return line.translate(charmap) if type(line) is str else line
'''
def strip_lines_from_File(originalfile, search_string):
    with originalfile.open('r', encoding="utf-8") as original:
      tempFile = originalfile.parent / 'tempFile.txt'

      with tempFile.open('w', encoding="utf-8") as temp: 
        for line in original:
          if line.find(search_string) == -1:
            temp.write(line)

      original.close()
      originalfile.unlink()
      temp.close()
      tempFile.replace(originalfile)
'''
def prependToPage(page, string):
  if not page[0].startswith('# '):
    string += '\n'
  page.insert(0,str(string))

def combinedMD_to_pages(docAsMD):
  with docAsMD.open('r', encoding="utf-8") as originalfile:
   pages = [] # list of pages, each page is list of lines
   pageNo = -1
   gotFirstHeading = False
   doingSummary = False
   for line in originalfile:
      if len(line) > 5 and line[0] == '#': # heading
        gotFirstHeading = True
        if line[1] == ' ': # heading 1
          if doingSummary:
            pages[pageNo].append(line)
          else:
            pageNo += 1 
            pages.append([line])
          doingSummary = False     
        elif pageNo == -1:
            doingSummary = True            
            pageNo = 0
            pages = [[line]]
        else:
          pages[pageNo].append(line)
      elif gotFirstHeading:
        pages[pageNo].append(line)

  return pages

# Image processing
def imageTag(line):
  # test endNamePos > 0 for found image
  startNamePos = line.find('![')
  if startNamePos >= 0:
    endNamePos = line.find(']',startNamePos + 2)
    if endNamePos > startNamePos:
      if line[endNamePos + 1] == '(':
        startPathPos = endNamePos + 1
        endPathPos = line.find(')',startPathPos + 1)
        if endPathPos > startPathPos:
          return startNamePos,endNamePos,startPathPos,endPathPos+1
  return 0,0,0,0

def extractImageParts(line):
  startNamePos,endNamePos,startPathPos,endPathPos = imageTag(line)
  imageName = ''
  imagePath = ''
  if endNamePos > 0:
    imageName = 'noName'
    startName = line[startNamePos:endNamePos].rfind('\\') + startNamePos + 1
    if startName > 1:
      imageName = line[startName:endNamePos]
    imagePath = line[startPathPos+1:endPathPos-1] 
  return line[0:startNamePos], imageName, imagePath, line[endPathPos:] 

def modifyImagePath(imgPath, mdFilePath, imageName):
  # New image path/file-name must have no spaces
  parentPath = mdFilePath.parent
  parentName = parentPath.name
  sourceImagePath = parentPath / imgPath
  imageName = imageName.replace(' ','_')
  newPath = str(Path("/media") / parentName / mdFilePath.stem / imageName ).replace(' ','_').replace('\\','/')
  if not (sourceImagePath.parent/imageName).exists():  
    sourceImagePath.replace(sourceImagePath.parent/imageName)
  return newPath

def correctImagePaths(page, mdFilePath):
  #Aspose path: C:/Hugo/Sites/Life_For_Liberia/static/media/Blog/2018_Ministry_Trip/2018_Ministry_Trip.002.jpeg
  #Writage path: media/2018_Ministry_Trip.002.jpeg
  sourceImagePath = Path('') 
  for lineNo, line in enumerate(page):
    startLine, imageName, imgPath, lineRemainder = extractImageParts(line)
    page[lineNo] = startLine
    while imageName != '' :
      imageTag = "![" + imageName + "]"
      if imageName == "noName":
        imageName = Path(imgPath).name
      imgPath = modifyImagePath(imgPath, mdFilePath, imageName)
      page[lineNo] += imageTag + '(' + imgPath + ')'
      startLine, imageName, imgPath, lineRemainder = extractImageParts(lineRemainder)
      page[lineNo] += startLine
    page[lineNo] += lineRemainder

def moveImageFiles(source_md, imgRoot):
    sourceImageFolder = source_md.parent / 'media'
    if sourceImageFolder.exists():
      imgFolder =  Path(str(imgRoot / source_md.parent.name  / source_md.stem).replace(' ','_'))
      haveMadeNewFolder(imgFolder)     
      for file in sourceImageFolder.glob('*'):
        imgPath = imgFolder / file.name
        if imgPath.exists():
          file.unlink()
        else: 
          file.replace(imgPath)
      sourceImageFolder.rmdir()

# File Conversion
def doc_to_docx(doc):
  wb = word.Documents.Open(str(doc))
  out_file = doc.with_suffix('.docx')
  print(f"Converting {doc.name} to .docx")
  wb.SaveAs2(str(out_file), FileFormat=16) # file format for docx
  wb.Close(-1) # save changes
  doc.unlink()

def updateStyles(sourceDoc):
  #word.visible = True
  wb = word.Documents.Open(str(sourceDoc))
  wb.UpdateStylesOnOpen = True   
  wb.AttachedTemplate = word_template
  # find.replace finds but doesn't replace, so do it explicitly!
  findObj = wb.ActiveWindow.Selection.Find
  findObj.ClearFormatting
  findObj.Format = True
  findObj.Style = wb.Styles("Indent")
  #findObj.Replacement.ClearFormatting
  #findObj.Replacement.Style = wb.Styles("Quote")
  findObj.Wrap = 1 # wdFindContinue
  success = success = findObj.Execute(FindText ="") # 2: wdReplaceAll, 1 wdReplaceOne
  while success:
    found = wb.ActiveWindow.Selection.Range
    found.Style = wb.Styles("Quote")
    success = findObj.Execute(FindText ="") # 2: wdReplaceAll, 1 wdReplaceOne

  wb.UpdateStyles()
  wb.Close(SaveChanges=-1) # save changes

def word_to_md(sourcePath, destFile):
  writage_word_saveas_md(sourcePath, destFile)
  #pandoc_WordToMD(sourcePath, file, mediaPath)
  #sub_pandoc_WordToMD(sourcePath, file, mediaPath)
  #mamoth_WordToMD(sourcePath, file)
  #aspose_WordToMD(sourcePath,file, mediaPath)

def writage_word_saveas_md(sourcePath, destFile):
  wb = word.Documents.Open(str(sourcePath))
  print(f"Converting {sourcePath.name} to .md")
  wb.SaveAs2(str(destFile), FileFormat=24) # file format for .md
  wb.Close(0) # don't save changes
  
def to_pdf(sourcePath, file, booklet = False):
  #word.visible = True
  wb = word.Documents.Open(str(sourcePath))
  wb.UpdateStylesOnOpen = False   
  wb.PageSetup.TopMargin = '2cm'
  wb.PageSetup.BottomMargin = '2cm'
  wb.PageSetup.LeftMargin = '2cm'
  wb.PageSetup.RightMargin = '2cm'
  wb.AttachedTemplate = word_template  
  #print("Attached after change:", wb.AttachedTemplate.Name)
  wb.UpdateStyles()

  if booklet:
    wb.PageSetup.PaperSize = 9 # A5
    #wb.PageSetup.Orientation = 0 
  else:
    wb.PageSetup.PaperSize =7 # A4
    #wb.PageSetup.Orientation = 0 
  wb.SaveAs2(str(file), FileFormat=17) # file format for pdf
  wb.Close(0) # don't save changes
  
'''
def mamoth_WordToMD(sourcePath, file):
  # does not render tables
  file = Path(str(file).replace(".","_m.",1))
  result = mammoth.convert_to_markdown(sourcePath)
  with file.open('w', encoding="utf-8") as outFile:
    outFile.write(result.value);
  outFile.close() 

def pandoc_WordToMD(sourcePath, file, mediaPath):
  # Exceptions thrown
  file = Path(str(file).replace(".","_p.",1))
  pypandoc.convert_file(str(sourcePath), 'markdown', extra_args = f"--extract-media={mediaPath}", outputfile=str(file)) 

def sub_pandoc_WordToMD(sourcePath, file, mediaPath):
  # does not render tables
  file = Path(str(file).replace(".","_s.",1))
  parms = ("-s", "-f", "docx", sourcePath,"-t", "markdown", f"--extract-media={mediaPath}", "-o", file)
  subprocess.run([pandocCmd, *parms], shell=False)

def aspose_WordToMD(sourcePath, file, mediaPath):
  # renders tables correctly
  #file = Path(str(file).replace(".","_a.",1))

  doc = aw.Document(str(sourcePath))
  saveOptions = aw.saving.MarkdownSaveOptions()
  saveOptions.images_folder = str(mediaPath)
  doc.save(str(file), saveOptions)
  strip_lines_from_File(file,"Aspose")
  strip_lines_from_File(file,"![](")
  strip_lines_from_File(file,"(#_Toc") # Aspose TOC
'''
# Front-Matter
def get_MultiPage_Summary(allPages):
  h3_summary = -1  
  summary = []
  firstLine = None

  for lineNo, line in enumerate(allPages[0]):
    if len(line) < 3: continue
    if h3_summary == -1 and line.startswith('### '): # H3 Summary before first H1 or H2
      h3_summary = lineNo
    elif line.startswith('#'): # any heading
      break
    elif h3_summary >= 0:
      summary.append(line.strip())
        
  if h3_summary == -1:
    summary = ''
  else:
    del(allPages[0][h3_summary])
    summary = '<br>'.join(summary)
    summary = convertFromSmartQuotes(summary)   
    #summary = summary.replace("#","")
    #summary = summary.replace("*","")

  return summary

def getDocTitle(page):
  title = None
  h3_summary = False  
  summary = []
  firstLine = None

  for line in page:
    if len(line) < 3: continue
    elif title is None and ((line.startswith('# ') or line.startswith('**'))): # heading 1, ** Bold for Title style
      title = line[2:].strip()
      title = convertFromSmartQuotes(title)
      title = title.replace('*','')
      title = title.replace('_',' ')
      title = title.replace(':',' ')
      if h3_summary: break
    elif not title is None and len(summary) == 0 and line.startswith('### '): # Summary from H3 after first H1 and before  H2
      h3_summary = True
    elif h3_summary:
      if line.startswith('#'):
        if title is None: continue
        else: break
      else:
        summary.append(line.strip())
    elif line.startswith('## '): # Create summary from heading 2's
      summary.append(line[2:].strip())
    elif firstLine is None and imageTag(line)[1] == 0 and len(tuple(c for c in line if c.isalpha())) > 100:
      firstLine = line.strip()
        
  if title == None:
    title = '¬' + line
  if summary == None:
    summary = '' if firstLine is None else firstLine
  else:
    summary = '<br>'.join(summary) 
  summary = convertFromSmartQuotes(summary)   
  summary = summary.replace('"',"'")
  summary = '"' + summary + '"'
  summary = summary.replace("#","")
  summary = summary.replace("*","")
  #summary = summary.replace("\n"," ")
  #summary = summary.replace(":"," ") 
  return title, summary

def create_frontMatter (weight, englishTitle, type, title, summary):
  frontMatter = ["---"]
  frontMatter.append("title: " + title)
  frontMatter.append("type: " + type)
  frontMatter.append("translationKey: " + englishTitle)
  frontMatter.append("summary: " + summary)
  frontMatter.append("weight: " + str(weight))
  frontMatter.append("---\n")
  return "\n".join(frontMatter)

# Translation
def noOfTrailingEndl(translationBlock):
    lastEndl = len(translationBlock)
    while translationBlock[lastEndl-1:lastEndl] == '\n':
      lastEndl -= 1
    return len(translationBlock) - lastEndl

def noOfLeadingSpaces(translationBlock):
    lastSpace = 0
    while translationBlock[lastSpace:lastSpace+1] == ' ':
      lastSpace += 1
    return lastSpace

def translateBlock(translationBlock, language):
  try:
    sourceEndl = noOfTrailingEndl(translationBlock)
    leadSpaces = noOfLeadingSpaces(translationBlock)
    translated = GoogleTranslator(source='en', target=language).translate(text=translationBlock)
    #translated = translator.translate_text(translationBlock, target_lang=language).text
    #translated = translated.text
    if translated is None: translated = ''
    translated = translated.replace('\xa0', ' ')
    translated = translated.strip()
    translated = ' ' * leadSpaces + translated
    transEnd = len(translated) - noOfTrailingEndl(translated)
    translated = translated[:transEnd] + '\n' * sourceEndl
  except  Exception as err:
    print(err)
    raise
  return translated

def translateBlockToFile(destFile, translationBlock, language):
  if len(translationBlock) > 0:
    translated = translateBlock(translationBlock, language)
    translated = translated.replace('] (', '](')
    print(translated[:10])
    destFile.write(translated)
  return "", 0

def repair_TOC(line, startLabel, endLabel, tocEnd):
  label = line[startLabel:endLabel]
  toc = label.replace("'","")
  toc = toc.replace(" ","-")
  toc = toc.lower()
  return line[:startLabel] + label + toc_tag + toc + ')' + line[tocEnd:]

def toc_pos(line, start):
  tocStart = line.find(toc_tag, start)
  if tocStart >= 0:
    labelStart = line.find('[', start) + 1
    tocEnd = line.find(')',tocStart) + 1
    return labelStart, tocStart, tocEnd 
  return 0,0,0

digits=set('0123456789')
def numeric_heading(line):
  digitFound = False
  for pos, c in enumerate(line[:10]):
      if digitFound: 
        if not c.isdigit():
          return pos 
      elif c in digits:       
        digitFound = True  
  return 0

def createMDtranslation(sourceFile, destFile, language):
  # Translate BEFORE inserting front-matter
  tempName = destFile.with_suffix('.temp')
  print(f"Translating {destFile.name} into {language}")
  with sourceFile.open('r', encoding="utf-8") as original:
    with tempName.open('w', encoding="utf-8") as translation: 
      translationBlock = ''
      blockLength = 0;
      for line in original:
        lineLen = len(line)
        if blockLength + lineLen > 4000:
          translationBlock, blockLength = translateBlockToFile(translation, translationBlock, language)

        if line == '\n': 
          translationBlock += line
          blockLength += lineLen
          continue

        startNamePos,endNamePos,startPathPos,endPathPos = imageTag(line)
        if endNamePos > 0: # image
          while endNamePos > 0:
            translationBlock += line[:startNamePos]
            translationBlock, blockLength = translateBlockToFile(translation, translationBlock, language)
            translation.write(line[startNamePos:endPathPos])
            line = line[endPathPos:]
            startNamePos,endNamePos,startPathPos,endPathPos = imageTag(line)
          translationBlock = line
          blockLength = len(line)
          continue

        numeric_pos = numeric_heading(line)
        while numeric_pos > 0:
          translationBlock, blockLength = translateBlockToFile(translation, translationBlock, language)
          translation.write(line[:numeric_pos])
          line = line[numeric_pos:]
          numeric_pos = numeric_heading(line)
          if numeric_pos > 0: translationBlock += line[:numeric_pos]
        translationBlock += line
        blockLength += lineLen

        translationBlock, blockLength = translateBlockToFile(translation, translationBlock, language)


      translateBlockToFile(translation, translationBlock, language)        
      translation.close()
      tempName.replace(destFile)

def loadSourceLanguageHeadings(source_md):
  title = ""
  with source_md.open('r', encoding="utf-8") as originalfile:
   gotTitle = False
   headings = [] # list of Heaadings
   for line in originalfile:
      if len(line) < 5: continue
      if line.startswith('# '): # heading 1
        headings.append(line[2:].replace(':','').strip())
        gotTitle = True
      elif not gotTitle: # ** Bold for Title style
        title = line.replace('*','').strip()
        gotTitle = True  
  return title, headings

# Top-Level Executed functions
def updateWebsite(webRootPath):
  ParmsAdd = ("add", ".")
  ParmsCommit = ("commit","-m", "Upload new content")
  ParmsPush = ("push", "origin", "main")
  Git = "git"
  subprocess.run([Git, *ParmsAdd], shell=False, cwd=webRootPath)
  subprocess.run([Git, *ParmsCommit], shell=False, cwd=webRootPath)
  subprocess.run([Git, *ParmsPush], shell=False, cwd=webRootPath)

def checkForUpdatedFiles():
  global word_template
  ini_file, webRootPath, sourceRootPath, word_template, sourceLanguage, languages, updated = readINI()
  if updated:
    msg = "Hugo Website root is " + str(webRootPath) + '\n\n'
    msg += "Docx root is " + str(sourceRootPath) + '\n\n'
    msg += "Source Language is: " + sourceLanguage + '\n\n'
    msg += "Template is: " + word_template + '\n\n'
    msg += "Languages are: " + str(languages)
    msg += f"\n\nEdit {ini_file.name} to make changes"
    if Msgbox("docxToHugo_ini.toml", msg, 1) == 2: quit()

  mdRootPath = webRootPath / "content"
  mediaRoot = webRootPath / "static/media"
  sourceLanguageMDfolder = mdRootPath / sourceLanguage
  global word
  word = win32com.client.Dispatch("Word.Application")
  word.visible = 0  
  for sourceDoc in sourceRootPath.rglob('*.doc'):
    if sourceDoc.stem.startswith('~'): continue
    doc_to_docx(sourceDoc)

  deleteRemovedFiles(sourceRootPath, mdRootPath, languages)
  allDocx = sorted(sourceRootPath.rglob('*.docx'))
  sourceRootStart = len(str(sourceRootPath)) + 1
  folder = None
  unableToTranslate = False
  for sourceDoc in allDocx:
    docName = sourceDoc.stem
    if docName.startswith('~'): continue     
    docFolder = str(sourceDoc.parent)[sourceRootStart:]    
    sourceLanguageMDpath = sourceLanguageMDfolder / docFolder    
    sourceLanguageTitles = []
  
    # convert to basic .md
    #if docName[-2:] == "V3": 
    #if docName[-3:] == "V3_": 
    #if docName == "2017 Ministry Trip": 
    #if docFolder == "Blog":
    #print(docFolder) 
    #if docFolder == r"Teaching\Disciple-Making through Storytelling\New Wineskins": 
    #if sourceLanguageMDpath.name == "Evangelism Stories": 
    if True:
      pass
    else: continue

    if sourceDoc.parent != folder: 
      source_weight = 1
      folder = sourceDoc.parent
    
    source_md = None
    makeMultiplePages = None       
    for lang in languages: 
      #if lang == 'fr' : continue
      if unableToTranslate and lang != sourceLanguage: continue
      langMDpath = mdRootPath / lang / docFolder       
      pdf_folder = langMDpath /"pdf"
      weight = source_weight
      # check dates on .pdf files against source      
      if fileNeedsUpdating(sourceDoc, pdf_folder): # update only this language
        updateStyles(sourceDoc)
        if source_md is None:
            source_md = sourceDoc.with_suffix('.md')       
            word_to_md(sourceDoc, source_md) # temporary file for pagination and translation
            sourceTitle, sourceLanguageTitles = loadSourceLanguageHeadings(source_md)
        # Create content folders               
        createMDfolder(langMDpath, lang, sourceLanguage)       
        haveMadeNewFolder(pdf_folder)
        pdf_A4_file = pdf_folder / (docName + "_A4.pdf") 
        pdf_A5_file = pdf_folder / (docName + "_A5.pdf")     
        lang_file = langMDpath / (docName + '.md')

        # save as combined .pdf        
        if lang == sourceLanguage: 
          lang_file = source_md
          langTitle = sourceTitle
          summaryTitle = f"# Summary of {sourceTitle}\n"
          to_pdf(sourceDoc, pdf_A4_file, False)          
          to_pdf(sourceDoc, pdf_A5_file, True)
        else:
          #continue
          try:           
            createMDtranslation(source_md, lang_file, lang)
            file_repair_TOC(lang_file)
            langTitle = translateBlock(sourceTitle, lang)
            summaryTitle = translateBlock(f"# Summary of {sourceTitle}\n", lang)
          except:
            unableToTranslate = True
            continue
          to_pdf(lang_file, pdf_A4_file, False)          
          to_pdf(lang_file, pdf_A5_file, True)
        pages = [0]         
        if docName[-1] != pdf_only_postfix:
          # split into list of one or more h1 files
          pages = combinedMD_to_pages(lang_file) 
          if lang != sourceLanguage: lang_file.unlink()
          summaries = []
          directorySummary = get_MultiPage_Summary(pages)
          if len(directorySummary) > 0:
            summaries.append(directorySummary)
            addSummaryTo_index(langMDpath, directorySummary)
          for pageNo, page in enumerate(pages):
            title, summary = getDocTitle(page)
            pageTitle = '\n# ' + title + '\n\n'
            summaries.append(pageTitle + summary.replace('"',''))            
            if title[0] == '¬':
              msg = f'First line of "{docName}" is not Bold or Heading 1. It is\n'
              msg += f'"{title[1:]}"\n Do you want to use {docName}?'
              if Msgbox(docFolder, msg, 1) == 2: continue
              title = docName.replace("_"," ")

            correctImagePaths(page, source_md)            
            md_filename = langMDpath / f'{docName}.md' 
            if len(pages) > 1:
              if makeMultiplePages is None:
                msg = f'"{docName}" has {len(pages)} Heading1 lines\n'
                msg += 'Do you want multiple web-pages?'
                makeMultiplePages = Msgbox(docFolder, msg, 3)
                if makeMultiplePages == 2: quit()
              if makeMultiplePages == 6: # Yes
                title_path = title.replace('/',' ')
                md_filename = langMDpath / f'{title_path}_{docName}.md'
                pdf_page_file = pdf_folder / f'{title_path}.pdf'
                pdf_page = page[:]
                pdf_page.insert(0,f'# {langTitle}\n')
                savePageAs_md(pdf_page, md_filename)
                to_pdf(md_filename, pdf_page_file)

            #if lang == sourceLanguage: sourceLanguageTitles.append(title)
            header = create_frontMatter(weight + pageNo, sourceLanguageTitles[pageNo], 'document', title, summary)  
            prependToPage(page, header)
            savePageAs_md(page, md_filename) # re-saved with frontmatter
          # next page
        # end only pdf 
        if makeMultiplePages == 6: # Yes
          a4Name = pdf_A4_file.with_stem(pdf_A4_file.stem + '_')
          a5Name = pdf_A5_file.with_stem(pdf_A5_file.stem + '_')
          if a4Name.exists() : a4Name.unlink()
          if a5Name.exists() : a5Name.unlink()
          pdf_A4_file.replace(a4Name)
          pdf_A5_file.replace(a5Name)
          summaries_md = langMDpath / f'{docName}_Summary.md'
          pdf_Summary_file = pdf_folder / (docName + "_Summary_A5.pdf")
  
          summaries.insert(0,summaryTitle)
          savePageAs_md(summaries, summaries_md)
          to_pdf(summaries_md, pdf_Summary_file)        
          header = create_frontMatter(weight + pageNo, sourceTitle + " Summary", 'document', summaryTitle[2:], summaryTitle[2:])
          prependToPage(summaries, header)
          savePageAs_md(summaries, summaries_md) # re-saved with frontmatter

        weight += len(pages); 
        # end updated
      else:
        fileSearch = f'*{docName}.md'
        matched = tuple(sourceLanguageMDpath.glob(fileSearch))
        weight += len(matched);
      # end if needs updating
    # next language       
    if source_md is not None: 
      moveImageFiles(source_md, mediaRoot)        
      source_md.unlink() 
    source_weight = weight 
  # next SourceDoc
  word.Quit()
  updateWebsite(webRootPath)

checkForUpdatedFiles()
