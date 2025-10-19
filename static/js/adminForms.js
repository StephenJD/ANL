// \static\js\adminForms.js

export function urlize(str) {
  return str.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]+/g, "");
}

export function getFormRecord(form) {
  const record = {};
  console.group("getFormRecord start");

  form.querySelectorAll("fieldset").forEach((fs, fi) => {
    const legendText = fs.querySelector("legend")?.textContent?.trim() || `<no legend>`;
    const fieldsetKey = urlize(legendText);
    console.log(`Fieldset[${fi}] legend: "${legendText}" => key: "${fieldsetKey}"`);

    const radios = fs.querySelectorAll("input[type=radio]");
    if (radios.length) {
      const checked = Array.from(radios).find(r => r.checked);
      if (checked) {
        const labelText = checked.nextSibling?.textContent?.trim() || checked.value;
        record[fieldsetKey] = labelText;
        console.log(`  radio group value: ${labelText}`);
      }
      return;
    }

    fs.querySelectorAll("label").forEach((label, li) => {
      const input = label.querySelector("input, select, textarea");
      if (!input) return;

      const nodes = Array.from(label.childNodes);
      const inputIndex = nodes.findIndex(n => n === input);
      let labelText = "";
      for (let i = inputIndex + 1; i < nodes.length; i++) {
        if (nodes[i].nodeType === Node.TEXT_NODE && nodes[i].textContent.trim()) {
          labelText = nodes[i].textContent.trim();
          break;
        }
      }
      if (!labelText) labelText = label.textContent.trim();

      const key = urlize(labelText);

      if (input.type === "checkbox") record[key] = input.checked;
      else record[key] = input.value.trim();

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
    const legendText = fs.querySelector("legend")?.textContent?.trim() || `<no legend>`;
    const fieldsetKey = urlize(legendText);
    console.log(`Fieldset[${fi}] legend: "${legendText}" => key: "${fieldsetKey}"`);

    const radios = Array.from(fs.querySelectorAll("input[type=radio]"));
    if (radios.length) {
      const storedValue = record[fieldsetKey];
      radios.forEach(r => {
        const labelText = r.nextSibling?.textContent?.trim() || r.value;
        r.checked = storedValue === labelText;
        console.log(`  Radio label="${labelText}" checked=${r.checked}`);
      });
      return;
    }

    fs.querySelectorAll("label").forEach(label => {
      const input = label.querySelector("input, select, textarea");
      if (!input) return;

      const nodes = Array.from(label.childNodes);
      const inputIndex = nodes.findIndex(n => n === input);
      let labelText = "";
      for (let i = inputIndex + 1; i < nodes.length; i++) {
        if (nodes[i].nodeType === Node.TEXT_NODE && nodes[i].textContent.trim()) {
          labelText = nodes[i].textContent.trim();
          break;
        }
      }
      if (!labelText) labelText = label.textContent.trim();

      const key = urlize(labelText);
      if (record[key] !== undefined) {
        if (input.type === "checkbox") input.checked = record[key];
        else input.value = record[key];
        console.log(`  Input key="${key}" set to "${record[key]}"`);
      } else {
        if (input.type === "checkbox") input.checked = false;
        else input.value = "";
      }
    });
  });

  console.groupEnd();
}


export function loadRecords({ records, listEl, form, editBtnClass }) {
  listEl.innerHTML = "";

  records.forEach((record, idx) => {
    const li = document.createElement("li");
    li.style.listStyle = "none";
    const parts = [`<button type="button" class="${editBtnClass} editButton" data-index="${idx}">Edit</button>`];

    form.querySelectorAll("fieldset").forEach(fs => {
      const legendText = fs.querySelector("legend")?.textContent || "<no legend>";
      const key = urlize(legendText);

      const radios = fs.querySelectorAll("input[type=radio]");
      if (radios.length) {
        const storedValue = record[key];
        if (storedValue) parts.push(`${legendText}: ${storedValue}`);
        return;
      }

      fs.querySelectorAll("label").forEach(label => {
        const input = label.querySelector("input, select, textarea");
        if (!input) return;
        const nodes = Array.from(label.childNodes);
        const inputIndex = nodes.findIndex(n => n === input);
        let labelText = "";
        for (let i = inputIndex + 1; i < nodes.length; i++) {
          if (nodes[i].nodeType === Node.TEXT_NODE && nodes[i].textContent.trim()) {
            labelText = nodes[i].textContent.trim();
            break;
          }
        }
        if (!labelText) labelText = label.textContent.trim();
        const value = record[urlize(labelText)] || record[key];
        if (value) parts.push(`${labelText}: ${value}`);
      });
    });

    li.innerHTML = parts.join(", ");
    listEl.appendChild(li);
  });
}
