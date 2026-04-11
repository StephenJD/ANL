console.log("[DEBUG] Loaded static/js/home/_index.js");

// Dynamically load Google Fonts and Material Symbols for this section
function loadFontLink(href) {
	if (document.querySelector(`link[href='${href}']`)) return;
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = href;
	link.crossOrigin = 'anonymous';
	document.head.appendChild(link);
}

// Plus Jakarta Sans, Inter, Material Symbols
loadFontLink('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
loadFontLink('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
