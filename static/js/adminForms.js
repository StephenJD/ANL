// /static/js/adminForms.js
export function urlize(str) {
  return str.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]+/g, "");
}

function getLabelKey(label) {
  const input = label.querySelector("input, select, textarea");
  if (!input) return "unnamed";
  // Get the text content of the label without the input element
  const clonedLabel = label.cloneNode(true);
  clonedLabel.querySelector("input, select, textarea")?.remove();
  return urlize(clonedLabel.textContent.trim());
}


export function getFormRecord(form) {
  const record = {};
  console.group("getFormRecord start");

  form.querySelectorAll("fieldset").forEach((fs, fi) => {
    const legendText = fs.querySelector("legend")?.textContent?.trim() || "<no legend>";
    const fieldsetKey = urlize(legendText);
    console.log(`Fieldset[${fi}] legend: "${legendText}" => key: "${fieldsetKey}"`);

    const radios = fs.querySelectorAll("input[type=radio]");
    if (radios.length) {
      const checked = Array.from(radios).find(r => r.checked);
      if (checked) {
        const labelText = checked.parentElement.textContent.trim();
        record[fieldsetKey] = labelText;
        console.log(`  radio group value: ${labelText}`);
      }
      return;
    }

    fs.querySelectorAll("label").forEach((label, li) => {
      const input = label.querySelector("input, select, textarea");
      if (!input) return;

      const key = getLabelKey(label);
      record[key] = input.value.trim();

      console.log(`  Input[${li}] key: "${key}", value: "${record[key]}"`);
    });
  });

  console.log("getFormRecord result:", record);
  console.groupEnd();
  return record;
}

export function populateForm(form, record) {
  console.group("populateForm start", record);

  form.querySelectorAll("fieldset").forEach((fs, fi) => {
    const legendText = fs.querySelector("legend")?.textContent?.trim() || "<no legend>";
    const fieldsetKey = urlize(legendText);
    console.log(`Fieldset[${fi}] legend: "${legendText}" => key: "${fieldsetKey}"`);

    const radios = Array.from(fs.querySelectorAll("input[type=radio]"));
    if (radios.length) {
      const storedValue = record[fieldsetKey];
      radios.forEach(r => {
        const labelText = r.parentElement.textContent.trim();
        r.checked = storedValue === labelText;
        console.log(`  Radio label="${labelText}" checked=${r.checked}`);
      });
      return;
    }

    fs.querySelectorAll("label").forEach(label => {
      const input = label.querySelector("input, select, textarea");
      if (!input) return;

      const key = getLabelKey(label);
      if (record[key] !== undefined) {
        input.value = record[key];
        console.log(`  Input key="${key}" set to "${record[key]}"`);
      } else {
        input.value = "";
      }
    });
  });

  console.groupEnd();
}

export function loadRecords({ records, listEl, form, editBtnClass }) {
  listEl.innerHTML = "";

  records.forEach((record, idx) => {
    console.group(`Record[${idx}]`, record);

    const li = document.createElement("li");
    li.style.listStyle = "none";
    const parts = [`<button type="button" class="${editBtnClass} editButton" data-index="${idx}">Edit</button>`];

    const name = record.username || record.name || `<unnamed>`;
    const role = record.role || "";
    const email = record.email || "";
    parts.push(`Name: ${name}`, `Role: ${role}`, `Email: ${email}`);

    li.innerHTML = parts.join(", ");
    listEl.appendChild(li);
    console.groupEnd();
  });
}
