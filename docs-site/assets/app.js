(function () {
  const items = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    items.forEach((item) => io.observe(item));
  } else {
    items.forEach((i) => i.classList.add('visible'));
  }

  document.querySelectorAll('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const targetId = btn.getAttribute('data-copy-target');
      const target = document.getElementById(targetId);
      if (!target) return;

      const text = target.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied';
      } catch (_) {
        btn.textContent = 'Copy failed';
      }

      setTimeout(() => {
        btn.textContent = 'Copy';
      }, 1200);
    });
  });

  document.querySelectorAll('[data-tab-group]').forEach((group) => {
    const buttons = group.querySelectorAll('[data-tab-btn]');
    const panels = group.querySelectorAll('[data-tab-panel]');

    const activate = (name) => {
      buttons.forEach((btn) => {
        const active = btn.getAttribute('data-tab-btn') === name;
        btn.classList.toggle('active', active);
      });

      panels.forEach((panel) => {
        const active = panel.getAttribute('data-tab-panel') === name;
        panel.hidden = !active;
      });
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => activate(btn.getAttribute('data-tab-btn')));
    });

    activate(buttons[0].getAttribute('data-tab-btn'));
  });
})();
