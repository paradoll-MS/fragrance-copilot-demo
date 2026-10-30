/* ==========================================================================
   「标注与标签」查询台：ABC 定义 + 标签体系 + 每支香精 + 每张工单
   数据按需加载 assets/abc.js（约 1.5 MB），不进主演示首屏
   ========================================================================== */
let ABCI = null;

function loadABC(cb) {
  if (window.ABC) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'assets/abc.js';
  s.onload = () => {
    const A = window.ABC;
    const cnt = {}, byTag = {}, ordersByCode = {};
    A.formulas.forEach(f => {
      const ids = f[5] ? f[5].split('|') : [];
      ids.forEach(id => { cnt[id] = (cnt[id] || 0) + 1; (byTag[id] = byTag[id] || []).push(f); });
    });
    (A.orders || []).forEach(o => {
      [...(o[11] || []), ...(o[12] || [])].forEach(code => (ordersByCode[code] = ordersByCode[code] || []).push(o));
    });
    ABCI = { cnt, byTag, ordersByCode, fByCode: new Map(A.formulas.map(f => [f[0], f])) };
    cb();
  };
  s.onerror = () => { $('#app').innerHTML = '<div class="empty">标签数据载入失败（assets/abc.js）</div>'; };
  document.body.append(s);
}

const LAYER_DESC = {
  A1: ['具体气味对象', '能指出"是什么东西的味道"：柑橘、甜橙、佛手柑'],
  A2: ['香族 / 韵调', '宽一级的类别或单一韵调：木质、果香、花香、辛香、乳香韵'],
  A3: ['复合香调', '调式命名：东方调、木质花香调、木质柑橘调'],
  B1: ['光影明暗', '明亮感、幽暗感、通透感、雾感、冷色调'],
  B2: ['温度体感', '清凉感、温暖感、空气感'],
  B3: ['质地重量', '轻盈感、厚重感、柔软感'],
  B4: ['真实度', '天然感、写实感、化工感'],
  B5: ['洁净感', '清新感、清爽感、洁净感'],
  B6: ['情绪', '愉悦明朗、平静安宁、放松舒缓'],
  B7: ['人格气质', '沉稳坚定、精致优雅、性感魅惑'],
  B8: ['熟悉度', '大众熟悉感、小众辨识感、经典传承感'],
  B9: ['季节时辰', '春夏秋冬与清晨、夜间联想'],
  B10: ['人群印象', '男性/女性/中性/婴童/年轻/成熟'],
  B11: ['通感（声）', '尖锐、低沉、圆润、安静的声感联想'],
};
const CDIMS = { '核心定位': '产品在货架上的位置：经典传承 / 流行商业 / 小众沙龙…', '常见香型香调': '对应的调式：柑橘调 / 花香调 / 馥奇调…', '场景风格适配': '用在哪：通勤商务 / 约会 / 聚会 / 户外…', '香气感知与情绪': '气质与情绪：气质表达 / 情绪体验 / 清洁联想…' };
const BGROUPS = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11'];

const qState = { tab: 'terms', q: '', layer: '', dim: '', cls: '', status: '', page: 0, onlyLabeled: true };
const layerOrder = l => (l[0] === 'A' ? +l.slice(1) : 100 + +l.slice(1));

function renderTags() {
  if (!window.ABC) {
    $('#app').innerHTML = `<div class="navcrumb"><a href="#/" data-act="home">项目列表</a> / 标注与标签</div>
      <div class="card"><h2>载入中…</h2><p class="small muted"></p></div>`;
    loadABC(() => renderTags());
    return;
  }
  const A = window.ABC, n = A.meta;
  const tabFromHash = (location.hash.split('/')[2] || '').trim();
  if (['terms', 'nodes', 'kcodes', 'formulas', 'orders'].includes(tabFromHash)) qState.tab = tabFromHash;
  const bTerms = A.terms.filter(t => t[2].startsWith('B'));
  const aCount = k => A.terms.filter(t => t[2] === k).length;
  const aCov = A.formulas.filter(f => (f[5] || '').split('|').some(x => x.startsWith('A'))).length;
  const bCov = A.formulas.filter(f => (f[5] || '').split('|').some(x => x.startsWith('B'))).length;
  const cCov = A.formulas.filter(f => (f[5] || '').split('|').some(x => x.startsWith('C'))).length;

  $('#app').innerHTML = `
    <div class="navcrumb"><a href="#/" data-act="home">项目列表</a> / 标注与标签</div>
    <div class="hero" style="padding:20px 22px">
      <h1 style="font-size:22px;margin:0 0 6px">标签体系与独立标注</h1>
      <p class="muted" style="margin:0">库内 ${num(n.formulas)} 支香精、${num(n.terms)} 个 A/B 术语、${num(n.nodes)} 个 C 节点、${num(n.kcodes)} 个 K 码、${num(n.orders)} 张工单。</p>
    </div>

    <div class="card">
      <h2 class="sec-title">ABC 的定义${hint('三者互不替代：A 描述气味对象，B 描述感受与风格，C 描述商业定位与使用场景。')}</h2>
      <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:12px">
        <div class="card flat" style="border-left:3px solid #26634e">
          <div class="chips">${chip('A · 主体气味', 'green')}${chip(num(aCov) + ' 支有标注', 'line')}</div>
          <h3 style="margin:8px 0 4px">主体气味</h3>
          <p class="small muted" style="margin:0">三个层级：A1 具体气味对象 → A2 香族/韵调 → A3 复合香调。
            客户三调里的香材只有"另有明确气味目标"时才能升级为 A。</p>
        </div>
        <div class="card flat" style="border-left:3px solid #4f6b7d">
          <div class="chips">${chip('B · 感受与风格')}${chip(num(bCov) + ' 支有标注', 'line')}</div>
          <h3 style="margin:8px 0 4px">感受与风格</h3>
          <p class="small muted" style="margin:0">11 组感受维度：光影、温度体感、质地、真实度、洁净、情绪、人格、熟悉度、季节、人群、通感。
            参考三调可以辅助推断 B。</p>
        </div>
        <div class="card flat" style="border-left:3px solid #a97b3f">
          <div class="chips">${chip('C · 定位与场景', 'gold')}${chip(num(cCov) + ' 支有标注', 'line')}</div>
          <h3 style="margin:8px 0 4px">定位与场景</h3>
          <p class="small muted" style="margin:0">四个维度 × 12 个内部品类：核心定位、香型香调、场景风格、感知情绪。
            C 只能取"当前品类"下的节点，跨品类会被剔除。</p>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>三层结构：每一层回答什么问题</h2>
      <div class="table-wrap"><table class="table compact">
        <thead><tr><th style="width:70px">层级</th><th style="width:140px">管什么</th><th style="width:70px">数量</th><th>典型标签</th><th style="width:300px">判定要点</th></tr></thead>
        <tbody>
          <tr><td>${chip('A1', 'green')}</td><td><b>${LAYER_DESC.A1[0]}</b></td><td class="mono">${aCount('A1')}</td>
            <td class="small">${esc(LAYER_DESC.A1[1])}</td><td class="small muted">必须有独立气味目标；不能把三调逐词映射成 A</td></tr>
          <tr><td>${chip('A2', 'green')}</td><td><b>${LAYER_DESC.A2[0]}</b></td><td class="mono">${aCount('A2')}</td>
            <td class="small">${esc(LAYER_DESC.A2[1])}</td><td class="small muted">比 A1 宽一级，仍属气味本体</td></tr>
          <tr><td>${chip('A3', 'green')}</td><td><b>${LAYER_DESC.A3[0]}</b></td><td class="mono">${aCount('A3')}</td>
            <td class="small">${esc(LAYER_DESC.A3[1])}</td><td class="small muted">调式命名，描述整体风格</td></tr>
          <tr><td>${chip('B1–B11', 'gray')}</td><td><b>感受与风格</b></td><td class="mono">${bTerms.length}</td>
            <td class="small">11 组维度，逐组见下方</td><td class="small muted">可从定位、人群、语境与参考三调推断，但必须给理由与来源</td></tr>
          <tr><td>${chip('C', 'gold')}</td><td><b>定位与场景</b></td><td class="mono">${A.nodes.length}</td>
            <td class="small">核心定位 / 香型香调 / 场景风格 / 感知情绪</td><td class="small muted">只能取当前内部品类的节点，跨品类会被剔除</td></tr>
        </tbody></table></div>
      <div class="hr"></div>
      <div class="small muted" style="margin-bottom:6px">B 分组（点击筛选）</div>
      <div class="chips">${BGROUPS.map(g => `<button class="chip" data-act="q-layer" data-id="${g}">
        <b style="font-family:Consolas,monospace">${g}</b> ${esc(LAYER_DESC[g][0])}
        <span class="muted">${A.terms.filter(t => t[2] === g).length}</span></button>`).join('')}</div>
      <p class="small muted" style="margin:10px 0 0">注：A/B 共 ${num(n.terms)} 个术语；C 共 ${num(n.nodes)} 个节点，分布在 12 个内部品类。</p>
    </div>

    <div class="card">
      <h2>判定规则</h2>
      <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:6px">
        <div><h3>A 必须有独立依据</h3><p class="small">客户明确的气味目标，或明确的主韵。竞品三调、参考香调表、AI 拼的香材组合只辅助 B/C。</p></div>
        <div><h3>没依据就留空</h3><p class="small">宁可 A 为空，也不把配角提升成主韵；空映射要在"映射复核"里写明原因，不能假装做完。</p></div>
        <div><h3>C 不出品类</h3><p class="small">只从当前内部品类的节点里选；跨品类会被剔除并留下审查说明。</p></div>
      </div>
      <div class="hr"></div>
      <h3>客户分层与本体 ABC 的区别</h3>
      <div class="table-wrap"><table class="table compact">
        <thead><tr><th></th><th>客户分层 S / A / B / C</th><th>香精本体 A / B / C</th></tr></thead>
        <tbody><tr><td><b>含义</b></td><td>客户的资源与上市优先级（首发 / 跟进 / 测试 / 储备）</td><td>气味对象 / 感受风格 / 定位场景</td></tr>
        <tr><td><b>来源</b></td><td>客户资料里的明确标注</td><td>标签体系 + 语义推断</td></tr>
        <tr><td><b>例子</b></td><td>逐本 S 级首发 4 款</td><td>A1 葡萄、A2 花香、B 通透感、C 洁面与卸妆</td></tr></tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="between row">
        <h2 class="sec-title">检索${hint('五个页签：标签、C 节点、K 码、香精、工单；支持关键词、层级与品类筛选、编号精确匹配。')}</h2>
        <div class="row"><input id="qInput" placeholder="关键词：标签 / 定义 / 编号 / 香精名 / 工单" style="width:280px">
          ${button('搜索', 'q-run', '', 'primary')}</div>
      </div>
      <div class="tabs" id="qTabs">${[['terms', 'A/B 标签'], ['nodes', 'C 节点'], ['kcodes', 'K 码映射'], ['formulas', '香精标注'], ['orders', '工单']].map(([k, v]) =>
    `<button data-act="q-tab" data-id="${k}" class="${qState.tab === k ? 'active' : ''}">${v}</button>`).join('')}</div>
      <div id="qFilters" class="row" style="margin-bottom:10px"></div>
      <div id="qResult"></div>
    </div>`;

  $('#qInput').value = qState.q;
  $('#qInput').onkeydown = e => { if (e.key === 'Enter') { qState.q = e.target.value.trim(); qState.page = 0; renderQResult(); } };
  renderQFilters();
  renderQResult();
}

function renderQFilters() {
  const A = window.ABC, box = $('#qFilters');
  if (qState.tab === 'terms') {
    const layers = [...new Set(A.terms.map(t => t[2]))].sort((x, y) => layerOrder(x) - layerOrder(y));
    box.innerHTML = `<span class="small muted">层级</span>` + [['', '全部'], ...layers.map(l => [l, l])].map(([v, t]) =>
      `<button class="chip ${qState.layer === v ? 'dark' : ''}" data-act="q-layer" data-id="${v}">${t}</button>`).join('');
  } else if (qState.tab === 'nodes') {
    const dims = [...new Set(A.nodes.map(n => n[2]))];
    box.innerHTML = `<span class="small muted">维度</span>` + [['', '全部'], ...dims.map(d => [d, d])].map(([v, t]) =>
      `<button class="chip ${qState.dim === v ? 'dark' : ''}" data-act="q-dim" data-id="${v}">${t}</button>`).join('')
      + `<span class="small muted" style="margin-left:12px">品类</span>` + [['', '全部'], ...[...new Set(A.nodes.map(n => n[1]))].map(c => [c, c])].map(([v, t]) =>
        `<button class="chip ${qState.cls === v ? 'dark' : ''}" data-act="q-cls" data-id="${v}">${esc(t)}</button>`).join('');
  } else if (qState.tab === 'orders') {
    const sts = [['', '全部'], ['todo', '待执行'], ['doing', '执行中'], ['done', '已完成'], ['waiting', '等待中'], ['cancelled', '已归档']];
    box.innerHTML = `<span class="small muted">状态</span>` + sts.map(([v, t]) =>
      `<button class="chip ${qState.status === v ? 'dark' : ''}" data-act="q-status" data-id="${v}">${t}</button>`).join('');
  } else if (qState.tab === 'formulas') {
    box.innerHTML = `<button class="chip ${qState.onlyLabeled ? 'dark' : ''}" data-act="q-labeled" data-id="1">只看有标注</button>`
      + `<button class="chip ${qState.onlyLabeled ? '' : 'dark'}" data-act="q-labeled" data-id="0">全部 ${num(A.meta.formulas)} 支</button>`
      + `<span class="small muted">支持编号精确匹配与标签名检索</span>`;
  } else {
    box.innerHTML = `<span class="small muted">可按 K 码、三级品类或别名搜索</span>`;
  }
}

function matchTag(f, label) { return (f[5] || '').split('|').some(id => (window.ABC.labels[id] || '') === label); }

function renderQResult() {
  const A = window.ABC, q = qState.q.toLowerCase(), L = A.labels;
  const box = $('#qResult');
  const head = (cols) => `<div class="table-wrap"><table class="table compact"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;

  if (qState.tab === 'terms') {
    let rows = A.terms.filter(t => (!qState.layer || t[2] === qState.layer)
      && (!q || (t[3] + t[4] + t[0]).toLowerCase().includes(q)));
    rows = rows.slice(0, 300);
    box.innerHTML = head(['层级', '标签', '定义', '覆盖香精', '']) + rows.map(t => {
      const c = ABCI.cnt[t[0]] || 0;
      return `<tr><td>${chip(t[2], t[1] === 'A' ? 'green' : 'gray')}</td><td><b>${esc(t[3])}</b>
        <div class="tiny muted mono">${esc(t[0])}</div></td>
        <td class="small muted">${esc(t[4])}</td><td class="mono">${num(c)}</td>
        <td>${c ? `<button data-act="q-drill" data-id="${esc(t[3])}">查香精</button>` : ''}</td></tr>`;
    }).join('') + `</tbody></table></div><p class="small muted">共 ${num(A.terms.filter(t => (!qState.layer || t[2] === qState.layer) && (!q || (t[3] + t[4]).toLowerCase().includes(q))).length)} 个术语（最多显示 300）</p>`;
  } else if (qState.tab === 'nodes') {
    let rows = A.nodes.filter(n => (!qState.dim || n[2] === qState.dim) && (!qState.cls || n[1] === qState.cls)
      && (!q || (n[4] + n[5] + n[6] + n[0]).toLowerCase().includes(q)));
    const total = rows.length; rows = rows.slice(0, 300);
    box.innerHTML = head(['品类', '维度', '节点路径', '描述', '覆盖', '']) + rows.map(n => `<tr>
      <td>${chip(n[1], 'line')}</td><td class="small">${esc(n[2])}</td>
      <td><b>${esc(n[5] || n[4])}</b><div class="tiny muted mono">${esc(n[0])}</div></td>
      <td class="small muted">${esc(n[6])}</td><td class="mono">${num(ABCI.cnt[n[0]] || 0)}</td>
      <td>${ABCI.cnt[n[0]] ? `<button data-act="q-drill" data-id="${esc(n[4])}">查香精</button>` : ''}</td></tr>`).join('')
      + `</tbody></table></div><p class="small muted">共 ${num(total)} 个节点（最多显示 300）</p>`;
  } else if (qState.tab === 'kcodes') {
    const rows = A.kcodes.filter(k => !q || (k[0] + k[1] + k[2] + k[3] + k[4] + k[5] + k[6]).toLowerCase().includes(q));
    box.innerHTML = head(['K 码', '三级品类', '规范类', '内部新类', '别名', '叠加身份']) + rows.map(k => `<tr>
      <td class="mono"><b>${k[0]}</b></td><td>${esc(k[3])}<div class="tiny muted">${esc(k[1] + ' / ' + k[2])}</div></td>
      <td class="small">${esc(k[4])}</td><td>${chip(k[5], 'blue')}</td>
      <td class="small muted">${esc((JSON.parse(k[6] || '[]') || []).join('、') || '—')}</td>
      <td class="small muted">${esc((JSON.parse(k[7] || '[]') || []).join('、') || '—')}</td></tr>`).join('')
      + `</tbody></table></div><p class="small muted">共 ${rows.length} 个 K 码（每个三级品类有且只有一个规范类与新类）</p>`;
  } else if (qState.tab === 'formulas') {
    let rows = A.formulas.filter(f => !q || (f[0] + ' ' + f[1] + ' ' + f[2]).toLowerCase().includes(q) || (f[5] || '').split('|').some(id => (L[id] || '').toLowerCase().includes(q)));
    if (qState.onlyLabeled) rows = rows.filter(f => f[5]);
    rows.sort((a, b) => (b[5] ? 1 : 0) - (a[5] ? 1 : 0) || (b[4] - a[4]) || (a[0] > b[0] ? 1 : -1));
    const total = rows.length; rows = rows.slice(0, 80);
    box.innerHTML = head(['编号', '名称', '品类', 'A / B / C 标注', '用样', '工单']) + rows.map(f => {
      const ids = (f[5] || '').split('|').filter(Boolean);
      const grp = p => [...new Set(ids.filter(id => id.startsWith(p)).map(id => L[id] || id))];
      const ords = (ABCI.ordersByCode[f[0]] || []).length;
      return `<tr><td><b class="mono">${esc(f[0])}</b></td><td>${esc(f[1])}</td><td class="small">${esc(f[2])}</td>
        <td class="small">${grp('A').length ? `<span class="rule">A</span> ${grp('A').slice(0, 5).map(x => chip(x, 'green')).join('')}` : ''}
          ${grp('B').length ? ` <span class="rule">B</span> ${grp('B').slice(0, 4).map(x => chip(x)).join('')}` : ''}
          ${grp('C').length ? ` <span class="rule">C</span> ${grp('C').slice(0, 3).map(x => chip(x, 'gold')).join('')}` : ''}
          ${!ids.length ? '<span class="muted">未标注</span>' : ''}</td>
        <td class="mono">${num(f[4])}</td><td class="mono">${ords}</td></tr>`;
    }).join('') + `</tbody></table></div><p class="small muted">命中 ${num(total)} 支，显示前 ${rows.length} 支；点行看完整标注与出处</p>`;
  } else {
    const rank = s => ({ done: 0, doing: 1, todo: 2, waiting: 3, cancelled: 9 })[s] ?? 5;
    let rows = (A.orders || []).filter(o => (!qState.status || o[3] === qState.status)
      && (!q || (o[0] + o[1] + o[2] + o[3] + o[4] + o[5]).toLowerCase().includes(q)));
    rows = [...rows].sort((a, b) => rank(a[3]) - rank(b[3]) || String(b[9]).localeCompare(String(a[9])));
    box.innerHTML = head(['类型', '状态', '项目 · 子项目', '结果 / 编号', '创建', '']) + rows.map((o, i) => `<tr>
      <td><b>${esc(o[1])}</b><div class="tiny muted mono">${esc(o[0])}</div></td>
      <td>${chip(({ todo: '待执行', doing: '执行中', done: '已完成', waiting: '等待中', cancelled: '已归档' })[o[3]] || o[3], o[3] === 'done' ? 'green' : o[3] === 'cancelled' ? 'gray' : 'warm')}</td>
      <td class="small">${esc(o[5])}<div class="tiny muted">${esc(o[4])}</div></td>
      <td class="small">${esc((o[10] || '').slice(0, 40))}${(o[11] || []).length ? `<div class="tiny">实发 ${esc(o[11].join('、'))}</div>` : ''}</td>
      <td class="tiny muted mono">${esc((o[9] || '').slice(0, 16))}</td>
      <td><button data-act="q-order" data-id="${i}">详情</button></td></tr>`).join('')
      + `</tbody></table></div><p class="small muted">共 ${rows.length} 张工单</p>`;
    state._orders = rows;
  }
}

/* 详情弹窗 */
function orderDetail(idx) {
  const o = state._orders[idx];
  const inner = (window.ABC.projects || []).find(p => p.id === o[6]);
  openDialog(`${o[1]} · ${o[5]}`, `
    <div class="kv">
      <dt>工单编号</dt><dd class="mono">${esc(o[0])}</dd>
      <dt>状态</dt><dd>${esc(o[3])}</dd>
      <dt>项目</dt><dd>${esc(o[4])}</dd>
      <dt>子项目</dt><dd>${esc(o[5])}</dd>
      <dt>负责人 / 截止</dt><dd>${esc([o[7], o[8]].filter(Boolean).join(' · ') || '—')}</dd>
      <dt>选定编号</dt><dd class="mono">${esc((o[12] || []).join('、') || '—')}</dd>
      <dt>实发编号</dt><dd class="mono">${esc((o[11] || []).join('、') || '—')}</dd>
    </div>
    <div class="hr"></div><h3>结果 / 交付说明</h3><div class="textbox">${esc(o[10] || '—')}</div>
    <div class="toolbar">${button('打开该子项目（若在演示项目内）', 'q-open-sub', o[6])}</div>`);
}

function formulaDetail(code) {
  const A = window.ABC, f = ABCI.fByCode.get(code); if (!f) return;
  const ids = (f[5] || '').split('|').filter(Boolean);
  const L = A.labels;
  const seen = new Set(); const grp = p => ids.filter(id => id.startsWith(p)).map(id => ({ id, label: L[id] || id })).filter(x => !seen.has(x.id) && seen.add(x.id));
  const orders = ABCI.ordersByCode[code] || [];
  const defOf = id => (A.terms.find(t => t[0] === id) || [])[4] || (A.nodes.find(n => n[0] === id) || [])[6] || '';
  openDialog(`${code} · ${f[1]}`, `
    <div class="chips">${chip(f[2], 'line')}${chip('用样 ' + num(f[4]) + ' 次', 'gray')}${chip('价格 ' + (f[3] == null ? '待补' : f[3]), 'line')}</div>
    <div class="hr"></div>
    ${[['A', 'green'], ['B', 'gray'], ['C', 'gold']].map(([d, cls]) => {
    const g = grp(d);
    return `<h3>${d} · ${g.length} 个</h3><div class="chips">${g.map(x => `<span class="chip ${cls}" title="${esc(defOf(x.id))}">${esc(x.label)}</span>`).join('') || '<span class="small muted">未标注</span>'}</div>`;
  }).join('')}
    <div class="hr"></div><h3>出现过的工单（${orders.length}）</h3>
    ${orders.length ? orders.map(o => `<p class="small">${esc(o[1])} · ${esc(o[5])} · ${esc(o[3])}</p>`).join('') : '<p class="small muted">该编号只出现在标签库中，没有关联工单记录。</p>'}`, true);
}

const QACT = {
  'q-tab': id => { qState.tab = id; qState.page = 0; location.hash = 'tags/' + id; renderTags(); },
  'q-layer': v => { qState.layer = v; renderTags(); },
  'q-dim': v => { qState.dim = v; renderTags(); },
  'q-cls': v => { qState.cls = v; renderTags(); },
  'q-status': v => { qState.status = v; renderTags(); },
  'q-labeled': v => { qState.onlyLabeled = v === '1'; renderTags(); },
  'q-run': () => { qState.q = ($('#qInput').value || '').trim(); renderTags(); },
  'q-drill': label => { qState.tab = 'formulas'; qState.q = label; renderTags(); },
  'q-order': idx => orderDetail(+idx),
  'q-open-sub': spid => {
    const hit = D.projects.flatMap(p => p.subprojects.map(x => ({ p, x }))).find(o => o.x.id === spid);
    if (!hit) return toast('该子项目不在演示项目里（演示只带 4 个项目）');
    $('dialog[open]')?.close(); go(`s/${spid}`);
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = QACT[el.dataset.act];
  if (fn) { try { fn(el.dataset.id, e); } catch (err) { toast(err.message || '操作失败'); } }
});

// 香精行点击 → 详情
document.addEventListener('click', e => {
  const tr = e.target.closest('#qResult tbody tr');
  if (!tr || e.target.closest('button')) return;
  if (qState.tab !== 'formulas') return;
  const code = tr.querySelector('td b.mono')?.textContent?.trim();
  if (code) formulaDetail(code);
});
