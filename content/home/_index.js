// Dynamically load Google Fonts for Plus Jakarta Sans and Inter
// Dynamically load Tailwind CSS from CDN for this section
(function() {
	var id = 'tailwind-cdn';
	if (!document.getElementById(id)) {
		var script = document.createElement('script');
		script.id = id;
		script.src = 'https://cdn.tailwindcss.com?plugins=forms,container-queries';
		script.defer = true;
		document.head.appendChild(script);
	}
})();

// Dynamically load Google Fonts for Plus Jakarta Sans and Inter
(function() {
	var id = 'google-fonts-plus-jakarta-inter';
	if (!document.getElementById(id)) {
		var link = document.createElement('link');
		link.id = id;
		link.rel = 'stylesheet';
		link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap';
		document.head.appendChild(link);
	}
})();
