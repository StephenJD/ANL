// \netlify\functions\dynamic_generators\generate_content_editor.js

export default async function generate_content_editor() {

return `
<div class="wide-content">

<h1>Content Editor</h1>

<div style="display:flex;gap:40px;">

<div id="tree" style="width:320px;border-right:1px solid #ccc;padding-right:20px;"></div>

<div id="editor" style="flex:1;">

<form id="editForm"></form>

<div style="margin-top:20px;">
<button onclick="saveEdit()">Save</button>
<button onclick="publishEdits()">Publish</button>
</div>

</div>

</div>

<script>

let currentFile = null
let rawBody = ""

const dropdownSchema =
{
review_period:
[
"6m",
"12m",
"24m"
],

access:
[
"public",
"member",
"admin"
],

type:
[
"policy",
"form",
"page"
]
}

async function loadTree()
{

const res = await fetch("/.netlify/functions/list_content_tree")
const tree = await res.json()

document.getElementById("tree").appendChild(renderTree(tree))

}

function renderTree(nodes)
{

const ul = document.createElement("ul")
ul.style.listStyle = "none"
ul.style.paddingLeft = "15px"

nodes.forEach(node =>
{

const li = document.createElement("li")

if(node.type === "folder")
{

li.style.fontWeight = "bold"
li.textContent = node.name

li.appendChild(renderTree(node.children))

}
else
{

li.style.cursor = "pointer"
li.textContent = node.name

li.onclick = () => startEdit(node.path)

}

ul.appendChild(li)

})

return ul

}

async function startEdit(file)
{

currentFile = file

const res = await fetch("/.netlify/functions/start_edit",
{
method: "POST",
body: JSON.stringify({ file })
})

const data = await res.json()

parseMarkdown(data.content)

}

function parseMarkdown(md)
{

const parts = md.split("---")

const front = parts[1]
rawBody = parts.slice(2).join("---")

const lines = front.split("\\n")

const fields = {}

lines.forEach(line =>
{

const i = line.indexOf(":")

if(i > 0)
{

const k = line.slice(0, i).trim()
const v = line.slice(i + 1).trim()

fields[k] = v

}

})

renderForm(fields)

}

function renderForm(fields)
{

const form = document.getElementById("editForm")

form.innerHTML = ""

Object.keys(fields).forEach(k =>
{

const label = document.createElement("label")
label.textContent = k
label.style.display = "block"
label.style.marginTop = "10px"

let input

if(dropdownSchema[k])
{

input = document.createElement("select")

dropdownSchema[k].forEach(v =>
{

const opt = document.createElement("option")
opt.value = v
opt.textContent = v

if(v === fields[k]) opt.selected = true

input.appendChild(opt)

})

}
else
{

input = document.createElement("input")
input.value = fields[k]

}

input.name = k
input.style.width = "320px"

form.appendChild(label)
form.appendChild(input)

})

}

function buildMarkdown()
{

const form = document.getElementById("editForm")

const data = new FormData(form)

let front = "---\\n"

for(const [k,v] of data.entries())
{

front += k + ": " + v + "\\n"

}

front += "---\\n"

return front + rawBody

}

async function saveEdit()
{

const content = buildMarkdown()

await fetch("/.netlify/functions/save_edit",
{
method: "POST",
body: JSON.stringify(
{
file: currentFile,
content
})
})

alert("Saved")

}

async function publishEdits()
{

await fetch("/.netlify/functions/publish_edits",
{
method: "POST"
})

alert("Published")

}

loadTree()

</script>

</div>
`
}
