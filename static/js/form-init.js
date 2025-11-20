// \static\js/form-init.js
import { manageBinArrayForm } from "/js/binArrayInterface.js";

document.addEventListener("gated-page-loaded", async () => {

  const form = document.querySelector("form.verified-form");
  if (!form) return console.warn("No verified form found in DOM");

  const config = getFormConfig();
  if (config) {
    await populateCheckList(form, config);
    initializeBinArrayForm(form, config);
  }
  runFormHelpers(form);
});

/* --- SRP orchestration helpers --- */
function getFormConfig() {
  const configEl = document.getElementById("form-config");
  if (!configEl) return null;
  try {
    const config = JSON.parse(configEl.textContent);
    //console.log("[form-init] Form config parsed:", config);
    return config;
  } catch (err) {
    console.error("Failed to parse form config JSON:", err);
    return null;
  }
}

async function populateCheckList(form, config) {
  const container = form.querySelector(".check-list-container");
  if (!container) return;

  try {
    const res = await fetch("/.netlify/functions/manageBinArrays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "list",
        bin_id: config.checkList_bin_id,
        section_key: config.checkList_section_key
      })
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.records)) return;

    container.innerHTML = "";
    const fields = config.checkList_fields || ["name"];
    data.records.forEach(record => {
      const label = document.createElement("label");
      fields.forEach(f => {
        const value = record[f];
        if (value !== undefined) {
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.value = value;
          label.appendChild(cb);
          label.appendChild(document.createTextNode(" " + value));
        }
      });
      container.appendChild(label);
    });
  } catch (err) {
    console.error("Error populating check-list:", err);
  }
}

function initializeBinArrayForm(form, config) {
  try {
    manageBinArrayForm({
      bin_id: config.save_bin_id,
      sectionKey: config.save_sectionKey,
      listLabel: config.listLabel,
      form
    });
    //console.log("[form-init] manageBinArrayForm initialized");
  } catch (err) {
    console.error("Error initializing manageBinArrayForm:", err);
  }
}

/* --- Form UI helpers --- */
function runFormHelpers(form) {
  enableOptionalEmail(form);
  updateInlineFit(form);
  markAllRequiredFieldsets(form);
  renameRadioGroups(form);
  disableDateAutocomplete(form);
  autofillToday(form);
  disableRadiosUntilChecked(form);

  window.enableOptionalEmail = enableOptionalEmail;
  window.autofillToday = () => autofillToday(form);
  window.disableRadiosUntilChecked = () => disableRadiosUntilChecked(form);
  window.addEventListener("resize", () => updateInlineFit(form));
}

function updateInlineFit(form) {
  const marginBuffer = 8;
  const fitElements = (elements) => {
    const visible = elements.filter(el => el.offsetParent !== null);
    const totalWidth = visible.reduce((sum, el) => sum + el.getBoundingClientRect().width + marginBuffer, 0);
    visible.forEach(el => el.classList.toggle("inline-fit", totalWidth < form.offsetWidth));
  };

  form.querySelectorAll("input, select").forEach(input => {
    const label = input.previousElementSibling;
    if (label && label.tagName === "LABEL") fitElements([label, input]);
  });

  const buttons = Array.from(form.querySelectorAll("button"));
  for (let i = 0; i < buttons.length; i++) {
    const row = [buttons[i]];
    let next = buttons[i].nextElementSibling;
    while (next && next.tagName === "BUTTON") {
      row.push(next);
      i++;
      next = next.nextElementSibling;
    }
    if (row.length > 1) fitElements(row);
  }
}

function markAllRequiredFieldsets(form) {
  form.querySelectorAll("fieldset").forEach(fs => {
    const inputs = fs.querySelectorAll("input, textarea, select");
    if (Array.from(inputs).every(input => input.hasAttribute("required"))) fs.classList.add("all-required");
  });
}

function enableOptionalEmail(form) {
  const optionalEmail = form.querySelector("#optionalEmail");
  const hasSubmittedBy = form.querySelector("#submitted_by") !== null;
  if (!hasSubmittedBy && optionalEmail) optionalEmail.style.display = "block";
}

function renameRadioGroups(form) {
  let groupCounter = 0;
  let currentGroupRadios = [];
  const elements = Array.from(form.querySelectorAll('label, legend'));
  elements.forEach(el => {
    const radios = el.querySelectorAll('input[type="radio"]');
    if (radios.length) currentGroupRadios.push(...radios);
    else if (currentGroupRadios.length) {
      groupCounter++;
      currentGroupRadios.forEach(r => r.name = `r${groupCounter}`);
      currentGroupRadios = [];
    }
  });
  if (currentGroupRadios.length) {
    groupCounter++;
    currentGroupRadios.forEach(r => r.name = `r${groupCounter}`);
  }
}

function disableDateAutocomplete(form) {
  form.querySelectorAll('input[type="date"]').forEach(input => input.setAttribute('autocomplete', 'off'));
}

function autofillToday(form) {
  form.querySelectorAll('input[type="date"].autofill-today').forEach(input => { input.valueAsDate = new Date(); });
}

function disableRadiosUntilChecked(form) {
  form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    const radioFieldset = cb.closest('fieldset')?.querySelector('fieldset');
    if (!radioFieldset) return;
    const updateRadios = () => radioFieldset.disabled = !cb.checked;
    updateRadios();
    cb.addEventListener('change', updateRadios);
  });
}
