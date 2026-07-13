(function () {
  const cfg = window.CFB_LANDING || {};
  const url = cfg.downloadUrl || '#download';
  const version = cfg.version || '';
  const platforms = cfg.platforms || 'Windows · x64';

  const anchors = [
    document.getElementById('downloadPrimary'),
    document.getElementById('downloadSecondary'),
  ].filter(Boolean);

  for (const el of anchors) {
    el.setAttribute('href', url);
    if (url.startsWith('http') || url.endsWith('.exe') || url.includes('/downloads/')) {
      el.setAttribute('download', '');
    }
  }

  const meta = document.getElementById('downloadMeta');
  if (meta) {
    meta.textContent = version ? `${platforms} · v${version}` : platforms;
  }

  const sections = document.querySelectorAll('.section');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('isIn');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.18 }
    );
    sections.forEach((section) => io.observe(section));
  } else {
    sections.forEach((section) => section.classList.add('isIn'));
  }
})();
