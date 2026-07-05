(() => {
  const APP = document.getElementById('app');
  const ACCENT = '#2F6B7A';
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const NO_ENTRY = '(No entry written yet.)';

  const KINDS_META = [
    { key: 'Place', varName: '--kind-place' },
    { key: 'Topic', varName: '--kind-topic' },
    { key: 'Book', varName: '--kind-book' },
    { key: 'Date', varName: '--kind-date' },
  ];

  function blankDraft() {
    return { date: new Date().toISOString().slice(0, 10), title: '', topic: '', location: '', book: '', body: '' };
  }

  const state = {
    view: 'list', // 'list' | 'post' | 'compose'
    postId: null,
    editingId: null, // set when compose view is editing an existing entry
    query: '',
    group: 'date', // 'date' | 'place'
    searchOpen: false,
    posts: [],
    draft: blankDraft(),
  };

  function setState(patch) {
    Object.assign(state, patch);
    rerender();
  }

  function scrollTop() {
    window.scrollTo({ top: 0 });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isoFromS(s) {
    const str = String(s == null ? '' : s).padStart(8, '0');
    return str.slice(0, 4) + '-' + str.slice(4, 6) + '-' + str.slice(6, 8);
  }

  function buildPost(d) {
    const iso = d.date || new Date().toISOString().slice(0, 10);
    const parts = iso.split('-');
    const y = parts[0], m = parts[1] || '01', dd = parts[2] || '01';
    const mi = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
    const day = parseInt(dd, 10) || 1;
    const bodyText = (d.body || '').trim();
    const paras = bodyText ? bodyText.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) : [NO_ENTRY];
    const words = bodyText.split(/\s+/).filter(Boolean).length;
    const first = paras[0];
    return {
      id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      s: Number(y + m + dd),
      iso: iso,
      dOM: String(day).padStart(2, '0') + ' ' + MONTHS_SHORT[mi],
      year: y,
      dateLabel: MONTHS_LONG[mi] + ' ' + day + ', ' + y,
      read: Math.max(1, Math.round(words / 200)),
      topic: (d.topic || '').trim(),
      location: (d.location || '').trim() || 'Vancouver',
      title: (d.title || '').trim(),
      excerpt: first.length > 120 ? first.slice(0, 117) + '…' : first,
      body: paras,
      book: (d.book || '').trim(),
    };
  }

  // Reconstruct an editable draft from a stored post (which holds derived fields).
  function draftFromPost(p) {
    const bodyText = Array.isArray(p.body)
      ? (p.body.length === 1 && p.body[0] === NO_ENTRY ? '' : p.body.join('\n\n'))
      : (p.body || '');
    return {
      date: p.iso || isoFromS(p.s),
      title: p.title || '',
      topic: p.topic || '',
      location: p.location || '',
      book: p.book || '',
      body: bodyText,
    };
  }

  async function init() {
    try {
      const entries = await window.waterline.loadEntries();
      if (Array.isArray(entries)) state.posts = entries;
    } catch (e) {
      console.error('Failed to load entries', e);
    }
    rerender();
  }

  async function persist() {
    try {
      await window.waterline.saveEntries(state.posts);
    } catch (e) {
      console.error('Failed to save entries', e);
    }
  }

  function openCompose() {
    setState({ view: 'compose', editingId: null, draft: blankDraft() });
    scrollTop();
  }

  function openEdit(id) {
    const p = state.posts.find((x) => x.id === id);
    if (!p) return;
    setState({ view: 'compose', editingId: id, draft: draftFromPost(p) });
    scrollTop();
  }

  function cancelEdit() {
    const id = state.editingId;
    setState({ view: id ? 'post' : 'list', postId: id, editingId: null, draft: blankDraft() });
    scrollTop();
  }

  function deletePost(id) {
    const p = state.posts.find((x) => x.id === id);
    if (!p) return;
    const ok = window.confirm('Delete this entry? This can\u2019t be undone.\n\n\u201C' + (p.title || 'Untitled') + '\u201D');
    if (!ok) return;
    state.posts = state.posts.filter((x) => x.id !== id);
    persist();
    setState({ view: 'list', postId: null, editingId: null });
    scrollTop();
  }

  function saveEntry() {
    const d = state.draft;
    if (!d.title || !d.title.trim()) {
      const t = APP.querySelector('[data-focus-id="draft-title"]');
      if (t) t.focus();
      return;
    }
    const post = buildPost(d);
    if (state.editingId) {
      post.id = state.editingId;
      state.posts = state.posts.map((p) => (p.id === state.editingId ? post : p));
    } else {
      state.posts = [post, ...state.posts];
    }
    persist();
    setState({ view: 'post', postId: post.id, editingId: null, draft: blankDraft() });
    scrollTop();
  }

  function openPost(id) {
    setState({ view: 'post', postId: id });
    scrollTop();
  }

  function goToLocation(loc) {
    setState({ view: 'list', query: loc || '' });
    scrollTop();
  }

  function selectSuggestion(v) {
    setState({ query: v, searchOpen: false });
  }

  function goList() {
    setState({ view: 'list' });
    scrollTop();
  }

  function wave(len, amp, wl, y) {
    let d = 'M0 ' + y;
    for (let x = 8; x <= len; x += 8) {
      const yy = y + amp * Math.sin((x / wl) * Math.PI * 2);
      d += ' L' + x + ' ' + yy.toFixed(2);
    }
    return d;
  }

  // ---------- Derived render values ----------
  function computeVals() {
    const group = state.group;
    const q = (state.query || '').trim().toLowerCase();
    const hasQuery = q.length > 0;
    const allPosts = state.posts;
    const bookOf = (p) => p.book || '';
    const monthYearOf = (p) => p.dateLabel.split(' ')[0] + ' ' + p.year;
    const monthOf = (p) => p.dateLabel.split(' ')[0];
    const hay = (p) => [p.title, p.topic, p.location, p.dateLabel, monthYearOf(p), p.dOM, p.year, p.excerpt, bookOf(p)].join('  ').toLowerCase();

    const filtered = allPosts.filter((p) => !hasQuery || hay(p).includes(q)).slice().sort((a, b) => b.s - a.s);

    const uniq = (arr) => [...new Set(arr.filter(Boolean))];
    const kinds = [
      { key: 'Place', varName: '--kind-place', values: uniq(allPosts.map((p) => p.location)) },
      { key: 'Topic', varName: '--kind-topic', values: uniq(allPosts.map((p) => p.topic)) },
      { key: 'Book', varName: '--kind-book', values: uniq(allPosts.map(bookOf)) },
      { key: 'Date', varName: '--kind-date', values: uniq([...allPosts.map(monthYearOf), ...allPosts.map(monthOf), ...allPosts.map((p) => p.year)]) },
    ];

    let matches = [];
    if (hasQuery) {
      kinds.forEach((k) => k.values.forEach((v) => {
        if (String(v).toLowerCase().includes(q)) {
          matches.push({ kindLabel: k.key, value: v, varName: k.varName });
        }
      }));
      matches = matches.slice(0, 8);
    }

    const searchOpen = !!state.searchOpen;
    const showDropdown = searchOpen && hasQuery && matches.length > 0;
    const showCount = hasQuery && !showDropdown;

    const keyFn = group === 'place' ? (p) => p.location : (p) => p.year;
    const map = new Map();
    filtered.forEach((p) => {
      const k = keyFn(p);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    });
    const sections = [...map.entries()].map(([label, posts]) => ({
      label,
      count: String(posts.length).padStart(2, '0'),
      posts,
    }));

    const current = state.postId ? allPosts.find((p) => p.id === state.postId) : null;

    return {
      allPosts, filtered, sections, matches, showDropdown, showCount, hasQuery, q,
      current,
      noResults: hasQuery && sections.length === 0,
      isEmptyLog: !hasQuery && allPosts.length === 0,
      resultCount: String(filtered.length).padStart(2, '0'),
      postCount: String(allPosts.length).padStart(2, '0'),
    };
  }

  // ---------- Render: header ----------
  function renderHeader() {
    const showAdd = state.view !== 'compose';
    return `
      <header class="header">
        <div class="header-title" data-action="goList">Waterline</div>
        <div class="header-right">
          <span class="header-location">VANCOUVER &middot; 49.28&deg; N</span>
          ${showAdd ? `<button class="btn-new-entry" data-action="openCompose">+ New entry</button>` : ''}
        </div>
      </header>
    `;
  }

  // ---------- Render: search dynamic region (count + dropdown) ----------
  function renderSearchDynamic(vals) {
    const countHtml = vals.showCount ? `<div class="result-count">${vals.resultCount} MATCHING</div>` : '';
    const dropdownHtml = vals.showDropdown ? `
      <div class="dropdown">
        ${vals.matches.map((m) => `
          <div class="dropdown-item" data-action="selectSuggestion" data-value="${escapeHtml(m.value)}">
            <span class="dropdown-kind" style="color:var(${m.varName});">${escapeHtml(m.kindLabel)}:</span>
            <span class="dropdown-value" style="color:var(${m.varName});">${escapeHtml(m.value)}</span>
          </div>
        `).join('')}
      </div>
    ` : '';
    return countHtml + dropdownHtml;
  }

  // ---------- Render: sections list ----------
  function renderSections(vals) {
    const sectionsHtml = vals.sections.map((section) => `
      <section class="section">
        <div class="section-header">
          <span class="section-label">${escapeHtml(section.label)}</span>
          <span class="section-count">${section.count}</span>
        </div>
        ${section.posts.map((post) => `
          <div class="post-row" data-action="openPost" data-id="${escapeHtml(post.id)}">
            <div class="post-date-col">
              <div class="post-dom">${escapeHtml(post.dOM)}</div>
              <div class="post-year">${escapeHtml(post.year)}</div>
            </div>
            <div>
              <div class="post-meta">
                ${post.topic ? `<span>${escapeHtml(post.topic)}</span><span class="sep">/</span>` : ''}
                <span class="location">${escapeHtml(post.location)}</span>
              </div>
              <div class="post-title">${escapeHtml(post.title)}</div>
              <div class="post-excerpt">${escapeHtml(post.excerpt)}</div>
            </div>
          </div>
        `).join('')}
      </section>
    `).join('');

    const emptyHtml = vals.noResults
      ? `<div class="no-results">Nothing in the log matches <span class="q">&ldquo;${escapeHtml(state.query)}&rdquo;</span> &mdash; yet.</div>`
      : vals.isEmptyLog
      ? `<div class="empty-state">Your logbook is empty. Click <strong>+&nbsp;New&nbsp;entry</strong> above to write your first one.</div>`
      : '';

    return sectionsHtml + emptyHtml;
  }

  // ---------- Render: list view ----------
  function renderListView(vals) {
    const wavePath = wave(1560, 3, 120, 11);
    const wavePath2 = wave(1600, 2, 160, 12);

    const groupBtn = (key, label) => `
      <button class="group-btn ${state.group === key ? 'active' : ''}" data-action="setGroup" data-group="${key}">${label}</button>
    `;

    return `
      <div>
        <div class="waterline-wrap">
          <svg viewBox="0 0 1440 24" preserveAspectRatio="none">
            <path d="${wavePath}" fill="none" stroke="${ACCENT}" stroke-width="1.25" stroke-opacity="0.42" class="wave-a"></path>
            <path d="${wavePath2}" fill="none" stroke="${ACCENT}" stroke-width="1" stroke-opacity="0.2" class="wave-b"></path>
          </svg>
        </div>

        <p class="intro">An occasional logbook. I'm an engineer in Vancouver &mdash; by way of Paris and Kingston &mdash; working in project and commercial management, and volunteering with marine search and rescue. Mostly I write about work, the water, and the space between.</p>

        <div class="controls-row">
          <div class="search-box">
            <div class="search-input-row">
              <span class="search-icon">&#8981;</span>
              <input type="text" class="search-input" data-focus-id="search" value="${escapeHtml(state.query)}" placeholder="Search dates, places, topics, a book&hellip;" data-input="query" data-focusaction="query" />
            </div>
            <div class="search-dynamic">${renderSearchDynamic(vals)}</div>
          </div>
          <div class="groupby">
            <span class="groupby-label">Group by</span>
            <div class="groupby-buttons">
              ${groupBtn('date', 'Date')}
              ${groupBtn('place', 'Place')}
            </div>
          </div>
        </div>

        <div class="sections">${renderSections(vals)}</div>

        <footer class="site-footer">
          <span>${vals.postCount} ENTRIES</span>
          <span>MADE ON THE WEST COAST</span>
        </footer>
      </div>
    `;
  }

  // ---------- Render: post view ----------
  function renderPostView(vals) {
    const cur = vals.current;
    if (!cur) {
      return `<article class="post-view"><button class="back-btn" data-action="goList">&larr; Index</button><p>Entry not found.</p></article>`;
    }
    const hasTopic = !!cur.topic;
    const hasBook = !!cur.book;
    return `
      <article class="post-view">
        <div class="post-topbar">
          <button class="back-btn" data-action="goList">&larr; Index</button>
          <div class="post-actions">
            <button class="post-action-btn" data-action="editPost" data-id="${escapeHtml(cur.id)}">Edit</button>
            <span class="post-action-sep">&middot;</span>
            <button class="post-action-btn post-action-danger" data-action="deletePost" data-id="${escapeHtml(cur.id)}">Delete</button>
          </div>
        </div>

        <div class="post-meta-row">
          ${hasTopic ? `<span>${escapeHtml(cur.topic)}</span><span class="sep">/</span>` : ''}
          <span class="post-location-link" data-action="goToLocation" data-value="${escapeHtml(cur.location)}" title="See all entries from this place">${escapeHtml(cur.location)}</span>
          <span class="sep">/</span>
          <span>${escapeHtml(cur.dateLabel)}</span>
          <span class="sep">/</span>
          <span>${cur.read} min read</span>
        </div>

        ${hasBook ? `
          <div class="post-reading-line">READING &mdash; <span class="post-book-link" data-action="goToLocation" data-value="${escapeHtml(cur.book)}" title="See all entries read alongside this book">${escapeHtml(cur.book)}</span></div>
        ` : ''}

        <h1 class="post-h1">${escapeHtml(cur.title)}</h1>

        <div class="post-body">
          ${cur.body.map((para) => `<p>${escapeHtml(para)}</p>`).join('')}
        </div>

        <div class="post-footer">
          <button class="back-btn" data-action="goList" style="margin-bottom:0;">&larr; Back to the index</button>
        </div>
      </article>
    `;
  }

  // ---------- Render: compose view ----------
  function renderComposeView() {
    const d = state.draft;
    const editing = !!state.editingId;
    return `
      <article class="compose-view">
        <button class="back-btn" data-action="goList">&larr; Index</button>
        <div class="compose-label">${editing ? 'Edit entry' : 'New log entry'}</div>

        <input class="compose-title-input" data-focus-id="draft-title" data-input="draft.title" value="${escapeHtml(d.title)}" placeholder="Title" />

        <div class="compose-grid">
          <label class="field">
            <span class="field-label">Date</span>
            <input type="date" class="mono" data-focus-id="draft-date" data-input="draft.date" value="${escapeHtml(d.date)}" />
          </label>
          <label class="field">
            <span class="field-label">Topic <span class="field-hint">should there be one</span></span>
            <input class="sans" data-focus-id="draft-topic" data-input="draft.topic" value="${escapeHtml(d.topic)}" placeholder="Work" />
          </label>
          <label class="field">
            <span class="field-label">Location</span>
            <input class="sans" data-focus-id="draft-location" data-input="draft.location" value="${escapeHtml(d.location)}" placeholder="Vancouver" />
          </label>
        </div>

        <div class="reading-row">
          <label class="field">
            <span class="field-label">Reading</span>
            <input class="sans" data-focus-id="draft-book" data-input="draft.book" value="${escapeHtml(d.book)}" placeholder="A book you're reading" />
          </label>
        </div>

        <textarea class="compose-textarea" data-focus-id="draft-body" data-input="draft.body" placeholder="Write the entry&hellip;  (leave a blank line to start a new paragraph)">${escapeHtml(d.body)}</textarea>

        <div class="compose-actions">
          <button class="btn-save" data-action="saveEntry">${editing ? 'Save changes' : 'Save entry'}</button>
          <button class="btn-cancel" data-action="${editing ? 'cancelEdit' : 'goList'}">Cancel</button>
        </div>
      </article>
    `;
  }

  // ---------- Root render ----------
  function buildHtml() {
    const vals = computeVals();
    let body = '';
    if (state.view === 'list') body = renderListView(vals);
    else if (state.view === 'post') body = renderPostView(vals);
    else if (state.view === 'compose') body = renderComposeView();
    return `<div class="app-shell">${renderHeader()}${body}</div>`;
  }

  // Update only the search-dependent regions, leaving the search input (and its
  // focus/cursor) untouched. Used on every keystroke so we never rebuild the
  // whole DOM while typing.
  function updateSearchRegion() {
    const vals = computeVals();
    const dyn = APP.querySelector('.search-dynamic');
    if (dyn) dyn.innerHTML = renderSearchDynamic(vals);
    const sec = APP.querySelector('.sections');
    if (sec) sec.innerHTML = renderSections(vals);
  }

  function handleAction(action, el) {
    switch (action) {
      case 'goList': return goList();
      case 'openCompose': return openCompose();
      case 'openPost': return openPost(el.dataset.id);
      case 'editPost': return openEdit(el.dataset.id);
      case 'deletePost': return deletePost(el.dataset.id);
      case 'goToLocation': return goToLocation(el.dataset.value);
      case 'selectSuggestion': return selectSuggestion(el.dataset.value);
      case 'setGroup': return setState({ group: el.dataset.group });
      case 'saveEntry': return saveEntry();
      case 'cancelEdit': return cancelEdit();
      default: return;
    }
  }

  // Listeners are bound ONCE on the container. Because they live on APP (which is
  // never destroyed), re-rendering inner HTML never orphans or double-binds them.
  function setupDelegation() {
    APP.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el || !APP.contains(el)) return;
      handleAction(el.dataset.action, el);
    });

    // Fire before the search input's blur so selecting a suggestion isn't
    // pre-empted by the dropdown being torn down.
    APP.addEventListener('mousedown', (e) => {
      const el = e.target.closest('[data-action="selectSuggestion"]');
      if (el) e.preventDefault();
    });

    APP.addEventListener('input', (e) => {
      const el = e.target.closest('[data-input]');
      if (!el) return;
      const path = el.dataset.input;
      if (path === 'query') {
        state.query = el.value;
        state.searchOpen = true;
        updateSearchRegion();
      } else if (path.indexOf('draft.') === 0) {
        // No re-render: the input already holds the value; nothing else on
        // screen depends on it live. This is what kills the compose blink.
        state.draft[path.slice(6)] = el.value;
      }
    });

    APP.addEventListener('focusin', (e) => {
      if (e.target.matches && e.target.matches('[data-focusaction="query"]')) {
        state.searchOpen = true;
        updateSearchRegion();
      }
    });

    APP.addEventListener('focusout', (e) => {
      if (e.target.matches && e.target.matches('[data-focusaction="query"]')) {
        state.searchOpen = false;
        updateSearchRegion();
      }
    });
  }

  function rerender() {
    const active = document.activeElement;
    let focusInfo = null;
    if (active && active.dataset && active.dataset.focusId) {
      focusInfo = {
        id: active.dataset.focusId,
        start: typeof active.selectionStart === 'number' ? active.selectionStart : null,
        end: typeof active.selectionEnd === 'number' ? active.selectionEnd : null,
      };
    }

    APP.innerHTML = buildHtml();

    if (focusInfo) {
      const el = APP.querySelector(`[data-focus-id="${focusInfo.id}"]`);
      if (el) {
        el.focus();
        if (focusInfo.start != null && typeof el.setSelectionRange === 'function') {
          try { el.setSelectionRange(focusInfo.start, focusInfo.end); } catch (e) {}
        }
      }
    }
  }

  setupDelegation();
  init();
})();
