/* ==========================================================================
   香精项目 Copilot v3 · 界面复原版演示
   数据：window.DEMO（真实库导出，已脱敏）
   除 LLM 相关动作外，界面内的交互都在本地可用
   ========================================================================== */
const D = window.DEMO;
const LIB = D.library.rows;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => (v == null ? '—' : Number(v).toLocaleString('zh-CN'));

const TYPES = { find_product: '找一个香', match_sample: '对一个香味', recommend_simple: '推荐香 · 厂家', recommend_brand: '推荐香 · 品牌', modify: '改香', create: '创香' };
const STATUSES = {
  draft: '待生成', active: '推进中', briefed: '已整理', mapped: '已映射', recommended: '待选香', tasks: '执行中',
  sample_initial: '初样已完成', sample_final: '终样已完成', done: '已完成', cancelled: '已取消',
  todo: '待执行', doing: '执行中', waiting: '等待中', parsed: '已解析', needs_text: '待补充文本',
};
const STAGES = { draft: '准备需求', awaiting_source_sync: '等待首轮样品编号同步', awaiting_base: '确认基准原样', analysis: 'GC 分析', perfumery: '调香', evaluation: '评香验收', sampling: '打样', shipping: '寄样', feedback: '等待反馈', verification: '法规 / 质量核对', final_ready: '可核对终样', modification_draft: '准备改香需求' };
const LABELS = {
  name: '名称', customer: '客户', brand: '品牌', sales: '销售', evaluator: '评香', grade: '项目等级', summary: '摘要',
  category_l1: '一级品类', category_l2: '二级品类', category_l3: '三级品类', application: '应用', form: '产品形态',
  usage: '用法', substrate: '基质', dosage: '添加量', target_audience: '目标人群', theme: '气味要求',
  core_position: '核心定位', directions: '建议方向', direction_notes: '方向描述', references: '参考及意图', families: '香调家族',
  top: '前调', middle: '中调', base: '后调', main_accord: '主韵', note_references: '参考三调', feelings: '感受', scenes: '场景',
  exclusions: '排除项', intensity: '强度', longevity: '留香', diffusion: '扩散', old_formula: '基准内部号',
  target_price: '香精目标价（元/kg）', terminal_price: '终端价格', annual_volume: '年量', sample_due: '打样时间',
  markets: '销售市场', channel: '渠道', regulatory: '客户指定要求', allergen: '过敏原', halal: '清真', flash_point: '闪点',
  stability: '稳定性', color: '颜色', substrate_test: '基质测试', type: '交付类型', quantity: '数量', recipient: '收件',
  deadline: '交期', notes: '备注', customer_profile: '客户背景', contacts: '项目对接人', overall_deadline: '项目总体交期',
  coordination_notes: '项目对接约定', coordination_events: '项目协调事项', structure: '气味结构', principles: '调香原则',
};
const GROUPS = { project: '项目背景', product: '产品与应用', scent: '气味与定位', commercial: '商业条件', compliance: '客户法规与测试要求', deliverables: '交付' };

const state = {
  page: 'home', pid: null, sid: null, tab: 'artifacts',
  local: { selected: {}, decisions: {}, tasks: {}, checks: {}, abc: {} },
};

const proj = pid => D.projects.find(p => p.id === pid);
const subOf = (pid, sid) => (proj(pid)?.subprojects || []).find(s => s.id === sid);
const chip = (t, c = '') => `<span class="chip ${c}">${esc(t)}</span>`;
const button = (label, act, id = '', cls = '') => `<button class="${cls}" data-act="${act}" data-id="${esc(id)}">${esc(label)}</button>`;
const hint = tip => `<span class="hint" data-tip="${esc(tip)}">?</span>`;

function human(v) {
  if (v == null || v === '') return '';
  if (Array.isArray(v)) return v.map(human).filter(Boolean).join('；');
  if (typeof v === 'object') {
    const order = ['question', 'event', 'summary', 'reason', 'label', 'name', 'role', 'organization', 'phone', 'email',
      'channel', 'address', 'brand', 'product', 'version', 'intent', 'note', 'quote', 'text', 'requirement', 'disposition',
      'date', 'impact', 'owner', 'modification', 'action'];
    return order.filter(k => v[k]).map(k => human(v[k])).join(' · ') || Object.values(v).map(human).filter(Boolean).join(' · ');
  }
  return String(v).replace(/\b(recommend_brand|recommend_simple|find_product|match_sample|modify|create)\b/g, k => TYPES[k] || k);
}

function toast(msg, ms = 4000) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(state._toast);
  state._toast = setTimeout(() => el.classList.remove('show'), ms);
}

function openDialog(head, body, wide = false) {
  const d = document.createElement('dialog');
  d.className = wide ? 'view-dialog' : '';
  d.innerHTML = `<div class="between row"><h2>${esc(head)}</h2><button data-act="close">关闭</button></div>${body}`;
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
  return d;
}

let _arts = [];
function artName(id) {
  const a = _arts.find(x => x.id === id);
  return a ? a.filename.replace(/^[0-9a-f-]{36}/, '截图') : '资料';
}

function refsHTML(refs) {
  return (refs || []).map(r => `<div class="citation">
    ${r.artifact_id ? `<span class="tag-mini">${esc(artName(r.artifact_id))}</span>` : '人工填写'}
    <span class="muted small">${esc(r.loc || r.locator || '')}</span>
    ${r.quote ? `<blockquote>${esc(r.quote)}</blockquote>` : ''}
  </div>`).join('');
}

/* ---------------- 简报 ---------------- */
function briefHTML(b, includeProject = true) {
  if (!b || !Object.keys(b).length) return '<div class="empty">尚未生成简报</div>';
  const sections = Object.entries(GROUPS)
    .filter(([g]) => includeProject || g !== 'project')
    .map(([g, t]) => {
      const fields = Object.entries(b[g] || {}).filter(([k, v]) => LABELS[k] && human(v) !== '');
      if (!fields.length) return '';
      return `<section class="brief-section"><h3>${t}</h3><dl>${fields.map(([k, v]) =>
        `<div><dt>${esc(LABELS[k])}</dt><dd>${esc(k === 'direction_notes' ? Object.entries(v).map(([n, x]) => n + '：' + human(x)).join('；') : human(v))}</dd></div>`).join('')}</dl></section>`;
    }).filter(Boolean);
  return (sections.length ? sections.join('') : '<div class="empty">还没有简报。</div>')
    + (b.modification ? `<section class="brief-section"><h3>改动要求</h3><p>${esc(human(b.modification))}</p></section>` : '')
    + requirementsHTML(b) + ordinaryHTML(b) + planningHTML(b.planning)
    + (includeProject ? coordinationHTML((b.project || {}).coordination_events) : '')
    + ((b.open_questions || []).length ? `<section class="note"><h3>待确认</h3>${b.open_questions.map(q => `<p>${esc(human(q))}</p>`).join('')}</section>` : '');
}

function requirementsHTML(b) {
  const reqs = b.customer_requirements || [];
  if (!reqs.length) return `<section class="brief-section"><h3 class="sec-title">客户额外要求${hint('按现行口径，这里只收「额外文件 / 认证 / 对外宣称」三类；普通气味、相容、留香、数量、交期属于普通条件，放在下面的登记里。')}</h3>
    <p class="small muted">本项没有额外证明或宣称类要求。</p></section>`;
  return `<section class="brief-section"><h3 class="sec-title">客户额外要求${hint('只收文件 / 认证 / 对外宣称；每条必须能点回原文。')}</h3>
    ${reqs.map(r => `<div class="customer-check item"><strong>${esc(r.text)}</strong>
      ${chip(r.source_scope === 'inherited' ? '继承项目共用要求' : '本子项目要求', 'red')}
      <details><summary>已记录 · 查看来源</summary>${refsHTML(r.source_refs)}</details></div>`).join('')}</section>`;
}

function ordinaryHTML(b) {
  const reg = b.requirement_register || [];
  if (!reg.length) return '';
  return `<details class="brief-section"><summary>普通条件与历史分类记录（${reg.length}）${hint('这些是普通要求（气味、基质、性能、稳定性、数量、交期），不是"额外证明"，所以不进红色清单。')}</summary>
    <p class="small muted">原文与来源保留。</p>
    ${reg.map(r => `<div class="item"><p>${esc(r.text)}</p>${r.classification === 'needs_review' ? '<span class="small">旧分类待复核</span>' : ''}${refsHTML(r.source_refs)}</div>`).join('')}</details>`;
}

function planningHTML(p) {
  if (!p || !Object.keys(p).length) return '';
  const map = { launch_tier: '客户资源分层', development_target: '开发目标', commercialization_target: '商品化目标', launch_timing: '上市节奏', priority_reason: '优先依据' };
  const rows = Object.entries(p).filter(([, v]) => human(v));
  if (!rows.length) return '';
  return `<section class="brief-section"><h3 class="sec-title">开发与上市计划${hint('客户的 S/A/B/C 资源分层与香精的 ABC 语义标签是两套东西，不能混。')}</h3>
    <dl>${rows.map(([k, v]) => `<div><dt>${esc(map[k] || k)}</dt><dd>${esc(human(v))}</dd></div>`).join('')}</dl></section>`;
}

function coordinationHTML(events) {
  if (!events || !events.length) return '';
  return `<section class="brief-section"><h3>项目对接与协调</h3>${events.map(e => `<div class="item">
    <strong>${esc(e.action || '协调事项')}</strong>
    <p class="small">${esc([e.owner, e.due_original, e.due_resolved, e.destination, e.quantity, e.purpose].filter(Boolean).join(' · '))}</p>
    ${chip(({ planned: '计划中', confirmed: '已确认', done: '已完成' })[e.status] || '待确认')}${refsHTML(e.source_refs)}</div>`).join('')}</section>`;
}

/* ---------------- 路由 ---------------- */
function go(hash) { location.hash = hash; }
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  if (!parts.length) { state.page = 'home'; renderHome(); return; }
  if (parts[0] === 'p' && parts[1]) {
    if (!proj(parts[1])) { go(''); return; }
    state.page = 'project'; state.pid = parts[1]; state.tab = parts[2] || 'artifacts';
    renderProject(); window.scrollTo(0, 0); return;
  }
  if (parts[0] === 'tags') { state.page = 'tags'; if (typeof renderTags === 'function') renderTags(); else setTimeout(route, 60); return; }
  if (parts[0] === 's' && parts[1]) {
    const hit = D.projects.flatMap(p => p.subprojects.map(x => ({ p, x }))).find(o => o.x.id === parts[1]);
    if (!hit) { go(''); return; }
    state.page = 'sub'; state.pid = hit.p.id; state.sid = parts[1];
    renderSub(); window.scrollTo(0, 0); return;
  }
  go('');
}

/* ---------------- 首页 ---------------- */
function renderHome() {
  const cards = D.projects.map(p => `<div class="card project-card" data-act="open-project" data-id="${esc(p.id)}">
      <h3>${esc(p.name)}</h3>
      <div class="meta">${esc([p.customer, p.brand].filter(Boolean).join(' · '))}</div>
      <div class="chips">${chip(STATUSES[p.status] || p.status)}${p.grade ? chip(p.grade) : ''}${chip(p.subprojects.length + ' 个子项目', 'blue')}</div>
      <div class="small muted">${esc(p.tagline || '')}</div>
      <div class="small muted">${esc(p.updated_at || '')}</div>
    </div>`).join('');
  $('#app').innerHTML = `
    <div class="between row"><div><h1>项目</h1>
      <p class="muted">整理客户资料，理解需求，推进子项目。${hint('演示版：下方 4 个项目都是真实运行数据；上传、生成、问答等需要模型的动作用不了。')}</p></div></div>
    <div class="grid">${cards}</div>
    <div class="note" style="margin-top:16px">项目、资料、简报、子项目、ABC、候选、工单与检查项均取自真实运行记录。新建项目、上传资料、生成与问答需要模型，演示环境中未启用。</div>`;
}

/* ---------------- 项目页 ---------------- */
function renderProject() {
  const p = proj(state.pid); if (!p) return go('');
  _arts = p.artifacts;
  const tabs = [['artifacts', '资料'], ['brief', '项目简报'], ['subprojects', '子项目'], ['story', '项目故事']];
  const okRuns = (p.runs || []).filter(r => r.status === 'succeeded').length;
  const lastRun = (p.runs || [])[p.runs.length - 1];
  $('#app').innerHTML = `
    <div class="navcrumb"><a href="#/" data-act="home">项目列表</a> / ${esc(p.name)}</div>
    <div class="hero">
      <div class="between row">
        <div><h1>${esc(p.name)}</h1>
          <div class="muted">${esc([p.customer, p.brand, p.sales].filter(Boolean).join(' · '))}</div></div>
        <div class="row">${button('香精库', 'library')}${button('调用记录', 'usage')}
          <button data-act="qa" disabled title="演示环境不调用模型">问项目</button></div>
      </div>
      <div class="chips" style="margin-top:10px">
        ${chip(p.artifacts.length + ' 份资料')}${chip(p.subprojects.length + ' 个子项目', 'blue')}
        ${chip(STATUSES[p.status] || p.status)}${chip('成功生成 ' + okRuns + ' 次', 'gray')}
      </div>
      <div class="between row" style="margin-top:12px">
        <div class="small muted">全景理解已完成 · ${esc(lastRun ? lastRun.created_at : '')}${hint('一次调用读完全部资料，产出故事、简报、子项目与 ABC；写库前校验引用与依据，不过就整轮不写。')}</div>
        <button class="primary" data-act="gen" disabled title="演示环境不调用模型">结合最新资料生成</button>
      </div>
      <div class="small muted" style="margin-top:6px">一次整理项目故事、简报、子项目、ABC 与执行入口；之后可逐项修改。</div>
    </div>
    <div class="tabs">${tabs.map(([k, v]) => `<button data-act="tab" data-id="${k}" class="${state.tab === k ? 'active' : ''}">${v}</button>`).join('')}</div>
    <div id="tab"></div>`;
  const el = $('#tab');
  el.innerHTML = state.tab === 'artifacts' ? tabArtifacts(p)
    : state.tab === 'brief' ? tabBrief(p)
      : state.tab === 'subprojects' ? tabSubs(p)
        : tabStory(p);
}

function tabArtifacts(p) {
  return `<div class="card"><h2 class="sec-title">资料箱${hint('资料进来就解析成「带页段定位的文本」：Word 按段落与表格原序，PDF 逐页，扫描页转视觉识别，截图做视觉转写。')}</h2>
    <div class="grid">
      <div><label class="field">文本 / 会议纪要<textarea disabled placeholder="演示版不接收新资料"></textarea></label>
        <button disabled title="演示版不能新增资料">加入资料</button></div>
      <div class="dropzone"><label class="field">上传资料（可多选）<input type="file" disabled></label>
        <p class="small muted">PDF、Word、PPT、Excel、图片、音频；上传后解析并初步标注。</p></div>
      <div><label class="field">参考链接<input disabled placeholder="演示版不抓取链接"></label>
        <button disabled title="演示版不能抓取链接">读取链接</button></div>
    </div></div>
    <div class="list" style="margin-top:14px">
      ${p.artifacts.map(a => `<div class="item">
        <div class="between row">
          <div><strong>${esc(a.filename.replace(/^[0-9a-f-]{36}/, '截图 '))}</strong>
            <div class="art-meta">${esc(a.ext.toUpperCase())} · ${num(a.chars)} 字 · ${a.locator_count} 个定位段</div></div>
          <div class="row">${chip(STATUSES[a.status] || a.status, a.status === 'needs_text' ? 'warm' : '')}
            ${button('查看 / 补充', 'artifact', a.id)}</div>
        </div>
        <div class="small muted">${esc([a.source_type, a.role, a.summary].filter(Boolean).join(' · '))}</div>
      </div>`).join('')}
    </div>`;
}

function tabBrief(p) {
  return `<div class="card"><div class="between row"><h2 class="sec-title">项目简报${hint('客户身份、联系人、总体交期存在项目层；具体产品、气味、基质、局部交期存在各自子项目。')}</h2>
      ${button('编辑简报', 'edit-brief', 'project')}</div>
    ${briefHTML(p.brief)}</div>`;
}

function tabStory(p) {
  const s = p.story || {};
  if (!s.summary) return `<div class="card"><h2>项目故事</h2><div class="empty">该项目最近一次生成未成功，故事没有更新；原始资料仍可随时查阅。</div></div>`;
  const secMap = { decisions: '关键决定', conflicts: '信息冲突', open_questions: '待确认', warnings: '理解提示', ontology_gaps: '标签本体缺口' };
  return `<div class="card"><h2 class="sec-title">项目故事${hint('故事里的每一条都带出处；摘要不替代原文。')}</h2>
      <p class="pre">${esc(human(s.summary))}</p>
      ${(s.timeline || []).map(t => `<div class="timeline"><div class="small muted">${esc(t.date || '')}</div>
        <p>${esc(human(t.event))}</p>${refsHTML(t.source_refs)}</div>`).join('')}
      ${['decisions', 'conflicts', 'open_questions', 'warnings', 'ontology_gaps'].filter(k => (s[k] || []).length)
      .map(k => `<section><h3>${secMap[k]}</h3>${s[k].map(x => `<p>${esc(human(x))}</p>`).join('')}</section>`).join('')}
    </div>
    <div class="card"><h2 class="sec-title">需求覆盖${hint('每条真实需求要么进了某个子项目，要么说明为什么只作参考；漏掉任何一条，这轮理解都不合格。')}</h2>
      ${(s.coverage || []).map(c => `<div class="item"><strong>${esc(c.requirement)}</strong><p>${esc(c.disposition)}</p>
        ${chip((c.subproject_keys || []).join(' / '), 'gray')}${refsHTML(c.source_refs)}</div>`).join('') || '<div class="muted">—</div>'}
    </div>
    <div class="card"><h2>全部资料</h2>${p.artifacts.map(a => `<p>${button(a.filename.replace(/^[0-9a-f-]{36}/, '截图 '), 'artifact', a.id)}</p>`).join('')}</div>`;
}

/* ---------------- 子项目列表：承袭叠角 ---------------- */
function abcCount(s) {
  return {
    A: (s.abc.a1 || []).length + (s.abc.a2 || []).length + (s.abc.a3 || []).length,
    B: (s.abc.b || []).length, C: (s.abc.target_cs || []).length,
  };
}

function subCard(s) {
  const cnt = abcCount(s);
  return `<div class="card project-card child" data-act="open-sub" data-id="${esc(s.id)}">
    <h3>${esc(s.title)}</h3>
    <div class="chips">${chip(TYPES[s.task_type] || s.task_type)}${chip(STATUSES[s.status] || s.status)}
      ${s.planning?.launch_tier ? chip('上市分层 ' + s.planning.launch_tier, 'blue') : ''}
      ${s.parent_subproject_id ? chip('衍生', 'warm') : ''}</div>
    <div>${esc(s.category_l3 || '品类待确认')} · ${s.price_target != null ? esc(s.price_target) + ' 元/kg' : '价格待补充'}</div>
    <div class="small muted">A ${cnt.A} · B ${cnt.B} · C ${cnt.C}${s.rec ? ' · 候选 ' + num(s.rec.meta.total) : ''}</div>
  </div>`;
}

function tabSubs(p) {
  const subs = p.subprojects;
  const roots = subs.filter(s => !s.parent_subproject_id);
  const kidsOf = id => subs.filter(s => s.parent_subproject_id === id);
  return `<div class="between row"><h2 class="sec-title">子项目（${subs.length}）${hint('有承袭关系的：后来新建的改香项盖在原项上，只露出原项一条边——点那条边可以回到原项。')}</h2>
      ${button('手工添加', 'new-sub')}</div>
    <div class="grid">${roots.map(s => {
    const kids = kidsOf(s.id);
    if (!kids.length) return `<div>${subCard(s)}</div>`;
    return `<div class="stack">
        ${kids.map(k => `<div class="under" data-act="open-sub" data-id="${esc(s.id)}" title="原项：${esc(s.title)}（首轮记录，只读）">
            <div class="line">${chip('原项', 'gray')}<b>${esc(s.title)}</b>
              <span class="corner">${s.planning?.launch_tier ? s.planning.launch_tier + ' 级 · ' : ''}只读 ↗</span></div></div>`).join('')}
        ${kids.map(k => subCard(k)).join('')}
        <div class="chain"></div>
      </div>`;
  }).join('')}</div>`;
}

/* ---------------- 子项目页 ---------------- */
function renderSub() {
  const p = proj(state.pid), s = subOf(state.pid, state.sid);
  if (!s) return go('');
  _arts = p.artifacts;
  const locked = ['sample_initial', 'sample_final', 'done', 'cancelled'].includes(s.status);
  const checks = s.checks.map(c => ({ ...c, status: state.local.checks[c.code] || c.status }));
  const tasks = s.tasks.map(t => ({ ...t, status: state.local.tasks[t.id] || t.status }));
  const selected = state.local.selected[s.id] || s.selected || [];
  const stage = STAGES[s.workflow_stage] || '按下方任务推进';

  $('#app').innerHTML = `
    <div class="navcrumb"><a href="#/" data-act="home">项目列表</a> / <a href="#/p/${p.id}/subprojects" data-act="open-project" data-id="${p.id}">${esc(p.name)}</a> / 子项目</div>
    <div class="hero"><div class="between row">
      <div><h1>${esc(s.title)}</h1>
        <div class="chips">${chip(TYPES[s.task_type])}${chip(STATUSES[s.status] || s.status)}${chip(s.category_l3 || '品类待确认')}${s.new_class ? chip(s.new_class) : ''}${s.planning?.launch_tier ? chip('客户分层 ' + s.planning.launch_tier, 'blue') : ''}</div></div>
      <div class="row">${button('返回项目', 'open-project', p.id)}${button('创建关联后续', 'follow-up')}</div>
    </div>
    ${s.parent_subproject_id ? `<div class="small muted">承袭自：${esc(subOf(p.id, s.parent_subproject_id)?.title || '原项')}　原样引用：${esc(s.base_sample_reference || '—')}</div>` : ''}
    ${s.type_basis?.reason ? `<div class="small muted">任务类型依据：${esc(s.type_basis.reason)}</div>` : ''}
    </div>
    <div class="split"><div>
      <div class="card"><div class="between row"><h2 class="sec-title">子项目简报${hint('这是调香师拿到的正文；工单里的需求就来自这里。')}</h2>
        ${locked ? '' : button('编辑简报', 'edit-brief', 'sub')}</div>
        <p class="pre">${esc((s.brief.handoff || '').split('\n客户额外要求：')[0])}</p>
        ${requirementsHTML(s.brief)}${planningHTML(s.planning)}
        <details><summary>完整需求与来源</summary>${briefHTML(s.brief, false)}</details></div>

      ${locked ? '' : `<div class="card"><h2 class="sec-title">执行条件${hint('这里的改动会同步到简报、筛选与未执行的工单；已完成的工单保持原快照。')}</h2>
        <div class="form-grid">
          <label class="field">标题<input id="sTitle" value="${esc(s.title)}"></label>
          <label class="field">三级品类<input id="sCategory" value="${esc(s.category_l3 || '')}"></label>
          <label class="field">香精目标价（元/kg）<input id="sPrice" type="number" min="0" step="any" value="${s.price_target ?? ''}"></label>
          <label class="field">方向<input id="sDirection" value="${esc(s.brief.scent?.directions?.[0] || '')}"></label>
          ${['modify', 'create'].includes(s.task_type) ? `<label class="field full">${s.task_type === 'modify' ? '改香基准内部号' : '参考内部号'}<input id="sBase" value="${esc(s.base_formula_code || '')}"></label>` : ''}
        </div>
        <div class="toolbar">${button('保存条件', 'save-sub', '', 'primary')}
          <span class="small muted">演示版：保存只更新页面，不写库。</span></div></div>`}

      <div class="card"><div class="between row"><h2 class="sec-title">需求 ABC${hint('A 是真正的主体气味，必须有客户明确目标或主韵依据；B 是感受与风格；C 是当前品类下的定位与场景。')}</h2>
        <span class="small muted">理解推断，可手动调整</span></div>
        <div class="grid">
          ${[['a1', 'A1 · 具体味道'], ['a2', 'A2 · 香调'], ['a3', 'A3 · 香韵'], ['b', 'B · 感受与风格'], ['target_cs', 'C · 定位与场景']].map(([k, t]) => `
            <div><h3>${t}</h3><div class="chips">${(s.abc[k] || []).map(x => chip(x.label, k === 'target_cs' ? 'blue' : '')).join('') || '<span class="small muted">暂未确定</span>'}</div>
            ${locked ? '' : button('调整', 'pick-abc', k)}</div>`).join('')}
        </div>
        ${s.basis.length ? `<details><summary>查看标签推断依据</summary>${s.basis.map(b => `<div class="item">
          <strong>${esc(b.label)}</strong>
          ${chip({ explicit_scent_target: '客户明确目标', main_accord: '主韵依据', reference_pyramid: '参考三调', context: '语境推断' }[b.role] || b.role, b.role === 'context' ? 'gray' : 'blue')}
          <span class="small muted">${Number.isFinite(Number(b.confidence)) ? Math.round(b.confidence * 100) + '%' : ''}</span>
          <p>${esc(b.reason || '')}</p>${refsHTML(b.refs)}</div>`).join('')}</details>` : ''}
        ${(s.rejected || []).length ? `<div class="note small">跨品类剔除：${s.rejected.map(x => esc(x.id)).join('、')}</div>` : ''}
      </div>

      ${s.rec ? `<div class="card"><div class="between row"><h2 class="sec-title">筛选与计分${hint('硬筛先排除不可用，再两轮计分：候选自身 A×1 + B×1 + C×3，再加候选自身 C 映射出的 AB 每个 +1。被硬筛锁定的标签不计直接分。')}</h2>
          <span class="small muted">${esc(s.rec.meta.algorithm || '')}</span></div>${filtersHTML(s, locked)}</div>
        <div class="card"><div class="between row"><h2 class="sec-title">推荐候选${hint('点「详情」展开命中链路；分数全部来自代码，不调模型。')}</h2>
          <div class="row"><label class="check"><input type="checkbox" id="onlyShort">只看短名单</label>${button('刷新', 'refresh-rec')}</div></div>
          <div id="recBox"></div></div>` : ''}

      ${!locked ? `<div class="card"><h2 class="sec-title">评香决定${hint('选中的编号会进入打样工单；改香/创香的「参考候选」不会直接派打样。')}</h2>
        <label class="field">选定的库内编号（可多项）<input id="selectedCodes" value="${esc(selected.join('，'))}" placeholder="勾选上方候选，或填写内部编号"></label>
        <div class="toolbar">${button(['create', 'modify'].includes(s.task_type) ? '保存参考香并附到调香任务' : '选定香精并派发打样', 'select-codes', '', 'primary')}
          ${button('检索香精库', 'library')}</div></div>` : ''}

      <div class="card"><h2 class="sec-title">部门任务${hint('工单不是一次生成的：完成前置才出现下一张；已完成的是快照，改需求不会回溯篡改。')}</h2>
        <div class="list">${tasks.length ? tasks.map(t => taskHTML(t, s)).join('') : '<div class="empty">选香或提交分析后生成对应工单。</div>'}</div></div>
    </div>

    <aside class="side">
      <div class="card"><h3 class="sec-title">进展与终点${hint('初样可由评香放行；终样要法规、质量都完成、清单无待核对。入库在本版关闭。')}</h3>
        <p>${esc(stage)}</p>
        <div class="toolbar">${button('完成初样', 'endpoint-initial')}${button('完成终样', 'endpoint-final')}
          <button disabled title="本版禁止入库写入">入库（未开放）</button></div>
        <p class="small muted">初样由评香说明放行；终样需法规、质量和逐项检查完成。</p></div>

      <div class="card"><h3 class="sec-title">客户与默认检查${hint('「规范类 × 销售地」自动生成法规、表现力、稳定性清单；客户额外提出的要求再叠加。')}</h3>
        <div class="small muted">已核对 ${checks.filter(c => c.status !== 'pending').length}/${checks.length}</div>
        <details><summary>展开逐项核对</summary>
          ${checks.map(c => `<div class="check-item ${c.source === 'customer' ? 'customer-check' : ''}">
            <strong>${esc(c.label)}</strong>${c.source === 'customer' ? chip('客户指定', 'red') : ''}
            <p class="small pre">${esc(c.detail || '')}</p>
            <div>${chip(({ pending: '待核对', confirmed: '已确认', na: '不适用' })[c.status], c.status === 'pending' ? 'warm' : '')}</div>
            <div class="toolbar">${button('确认', 'check-ok', c.code)}${button('不适用', 'check-na', c.code)}</div>
          </div>`).join('')}
        </details></div>

      <div class="card"><div class="between row"><h3 class="sec-title">外部实物样品${hint('客户说「已寄」只是资料信息；必须登记实际收样才能对香。')}</h3>
        ${button('登记收到', 'new-sample')}</div>
        ${(p.samples || []).map(x => `<p>${esc([x.brand, x.product, x.version].filter(Boolean).join(' '))}<br>
          <span class="small muted">${esc(x.received_at)} · ${({ none: '待对香', requested: '已请求分析', done: '分析已确认' })[x.analysis_status] || '已登记'}</span></p>`).join('') || '<p class="small muted">尚未登记收样。</p>'}
      </div>
    </aside></div>`;

  if (s.rec) renderRec(s);
  if ($('#onlyShort')) $('#onlyShort').onchange = () => renderRec(s);
}

function taskHTML(t, s) {
  const done = t.status === 'done';
  return `<div class="item"><div class="between row">
      <div><strong>${esc(t.title || t.type)}</strong> ${chip(STATUSES[t.status] || t.status)}</div>
      ${t.type === '入库' ? '<button disabled>未开放</button>' : (!done && !['评香选香', '评香对香'].includes(t.type) ? button('更新 / 确认完成', 'edit-task', t.id) : '')}
    </div>
    <details><summary>工单内容与交付信息</summary><p class="pre">${esc(t.detail || '')}</p>
      <p class="small">${esc(t.result || '')}${t.shipped ? '　实发号：' + esc(t.shipped.join('、')) : ''}</p>
      ${t.deps.length ? `<p class="small muted">依赖 ${t.deps.length} 张前置工单</p>` : ''}
    </details></div>`;
}

function filtersHTML(s, locked) {
  const f = s.hard_filters || {};
  const cats = [...new Set([...(f.categories || []), s.new_class].filter(Boolean))];
  const tagTxt = (f.tags || []).length
    ? (f.tags || []).map(g => `${g.mode === 'all' ? '全部' : '任一'}命中 ${(g.ids || []).map(id => D.labels.terms[id]?.label || D.labels.nodes[id]?.label || id).join(' / ')}`).join('；')
    : '未锁定 ABC 标签';
  return `<div id="filterPanel">
    <div class="row"><label class="check"><input type="checkbox" id="hardCategory" ${f.category_enabled ? 'checked' : ''}>内部品类硬筛</label>
      <label class="check"><input type="checkbox" id="hardPrice" ${f.price_enabled ? 'checked' : ''}>价格硬筛</label></div>
    <div class="chips">${cats.map(c => `<label class="check chip"><input class="category-check" type="checkbox" value="${esc(c)}" checked>${esc(c)}</label>`).join('')}</div>
    <label class="field">价格弹性 +<output id="elasticValue">${s.price_elasticity ?? 20}</output>% <input id="elastic" type="range" min="0" max="200" value="${s.price_elasticity ?? 20}"></label>
    <p class="small muted">${s.price_target != null ? '当前上限 ' + (s.price_target * (1 + (s.price_elasticity ?? 20) / 100)).toFixed(2) + ' 元/kg' : '未提供目标价，价格暂不限制。'}</p>
    <div class="small">硬标签：${esc(tagTxt)}</div>
    ${locked ? '' : `<div class="toolbar">${button('应用筛选', 'save-filters', '', 'primary')}${button('恢复默认硬筛', 'reset-filters')}</div>`}
  </div>`;
}

function renderRec(s) {
  const only = $('#onlyShort')?.checked;
  let items = (s.rec.items || []).map(x => ({ ...x, d: state.local.decisions[x.id] || x.decision }));
  if (only) items = items.filter(x => x.d === 'shortlist');
  const rej = s.rec.meta.rejected || {};
  const rejTxt = Object.entries(rej).filter(([, n]) => n)
    .map(([k, n]) => `${({ category: '品类', price: '价格', tags: '硬标签', brand: '品牌', hot: '爆品', new: '新品' })[k]} ${n}`).join('，');
  $('#recBox').innerHTML = `<p class="small muted">${num(s.rec.meta.total)} 个候选${s.rec.meta.max_price != null ? ' · 价格上限 ' + Number(s.rec.meta.max_price).toFixed(2) : ''}</p>
    ${items.length ? `<div class="table-wrap"><table class="table compact"><thead><tr>
      <th>选择</th><th>香精</th><th>直接 A / B / C</th><th>C 映射</th><th>总分</th><th>价格</th><th>用样</th><th>评香决定</th></tr></thead>
      <tbody>${items.slice(0, 30).map(x => `<tr class="${x.d === 'shortlist' ? 'picked' : ''}">
        <td><input class="rec-select" type="checkbox" value="${esc(x.code)}" ${(state.local.selected[s.id] || s.selected || []).includes(x.code) ? 'checked' : ''}></td>
        <td><strong>${esc(x.code)}</strong><div class="small">${esc(x.name)}</div>
          <div class="chips">${x.is_hot ? chip('爆品') : ''}${x.is_new ? chip('新品') : ''}${x.is_brand_dupe ? chip('大牌仿香', 'blue') : ''}</div></td>
        <td>${x.a_score ?? 0} / ${x.b_score ?? 0} / ${x.c_score ?? 0}</td>
        <td>${x.mapped_score ?? 0}</td>
        <td><strong class="score">${x.score ?? 0}</strong> ${scorebar(x)}</td>
        <td>${x.price ?? '待补价'}</td>
        <td>${x.usage_count ?? '无记录'}</td>
        <td>${chip(({ shortlist: '短名单', eliminated: '已淘汰', pending: '待定' })[x.d] || '待定', x.d === 'eliminated' ? 'gray' : '')}
          <div class="row">${button('短名单', 'shortlist', x.id)}${button('淘汰', 'eliminate', x.id)}${button('详情', 'rec-detail', x.id)}</div></td>
      </tr>`).join('')}</tbody></table></div>` : '<div class="empty">当前筛选下没有候选。</div>'}
    ${rejTxt ? `<details><summary>筛选排除数量</summary><p class="small muted">按筛选顺序首次被排除的候选：${esc(rejTxt)}</p></details>` : ''}`;
}

function scorebar(x) {
  const parts = [['sa', x.a_score || 0], ['sb', x.b_score || 0], ['sc', x.c_score || 0], ['sm', x.mapped_score || 0]];
  const tot = parts.reduce((a, [, v]) => a + v, 0) || 1;
  return `<span class="scorebar">${parts.map(([c, v]) => `<i class="${c}" style="width:${(v / tot * 100).toFixed(0)}%"></i>`).join('')}</span>`;
}

/* ---------------- 香精库检索 ---------------- */
function openLibrary(prefill = '') {
  const dlg = openDialog('香精库检索', `<div class="row"><input id="libQ" placeholder="编号 / 名称 / 品牌 / 品类" value="${esc(prefill)}">
      ${button('检索', 'lib-search', '', 'primary')}</div>
    <p class="small muted">库内 ${num(D.meta.db.library_items)} 条香精 · ${num(D.meta.db.library_tags)} 条标签关联。演示版检索本地索引，不连后端。</p>
    <div id="libRes"></div>`, true);
  const run = () => {
    const q = ($('#libQ').value || '').trim().toLowerCase();
    let rows = q ? LIB.filter(r => (r[0] + ' ' + r[1] + ' ' + r[8] + ' ' + r[2]).toLowerCase().includes(q)) : LIB;
    const total = rows.length;
    rows = rows.slice(0, 100);
    $('#libRes').innerHTML = `<div class="table-wrap"><table class="table compact"><thead><tr>
      <th>编号</th><th>名称</th><th>内部品类</th><th>价格</th><th>等级</th><th>标签</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><strong>${esc(r[0])}</strong></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td>
        <td>${r[3] == null ? '待补价' : r[3]}</td><td>${esc(r[4])}</td>
        <td>${r[5] ? chip('爆品') : ''}${r[6] ? chip('新品') : ''}${r[7] ? chip('大牌仿香', 'blue') : ''}${r[9] ? chip('中央库', 'gray') : ''}</td>
        <td><button data-act="lib-use" data-id="${esc(r[0])}">用这个</button></td></tr>`).join('')
      || '<tr><td colspan="7">没有结果</td></tr>'}</tbody></table></div>
      <p class="small muted">命中 ${num(total)} 条，显示前 ${num(rows.length)} 条</p>`;
  };
  dlg.querySelector('#libQ').onkeydown = e => { if (e.key === 'Enter') run(); };
  dlg.querySelector('#libQ').focus();
  state._libRun = run;
  run();
}

/* ---------------- 动作表 ---------------- */
const ACT = {
  home: () => go(''),
  'open-project': id => go(`p/${id}`),
  tab: id => { state.tab = id; location.hash = `p/${state.pid}/${id}`; },
  'open-sub': id => go(`s/${id}`),
  close: (id, e) => e.target.closest('dialog')?.close(),
  library: () => openLibrary(),
  'lib-search': () => state._libRun && state._libRun(),
  'lib-use': code => {
    const s = subOf(state.pid, state.sid);
    if (!s) return toast('已选中 ' + code + '（演示）');
    const cur = state.local.selected[s.id] || s.selected || [];
    state.local.selected[s.id] = [...new Set([...cur, code])];
    $('dialog[open]')?.close(); renderSub(); toast(`已把 ${code} 加入评香决定（演示版，不写库）`);
  },
  artifact: id => {
    const a = _arts.find(x => x.id === id); if (!a) return;
    openDialog(a.filename.replace(/^[0-9a-f-]{36}/, '截图 '), `
      <p class="small muted">${esc(a.source_type)} / ${esc(a.role)} · ${num(a.chars)} 字 · ${a.locator_count} 个定位段</p>
      <div class="chips" style="margin:8px 0">${(a.locators || []).slice(0, 12).map(l => chip(l, 'gray')).join('')}</div>
      <div class="textbox">${esc(a.text)}</div>`, true);
  },
  'edit-brief': scope => {
    const s = subOf(state.pid, state.sid);
    const b = scope === 'sub' ? s.brief : proj(state.pid).brief;
    const keys = scope === 'sub' ? Object.keys(GROUPS).filter(k => k !== 'project') : ['project'];
    openDialog(scope === 'sub' ? '子项目简报' : '项目简报', `
      <p class="note small">演示版：只读展示；真实系统里这里可以逐字段编辑并写库。</p>
      ${briefHTML(Object.fromEntries(keys.map(g => [g, b[g] || {}])), scope !== 'sub')}`, true);
  },
  'pick-abc': key => {
    const s = subOf(state.pid, state.sid);
    const pool = key === 'target_cs'
      ? Object.entries(D.labels.nodes).filter(([, v]) => v.new_class === s.new_class)
      : Object.entries(D.labels.terms).filter(([, v]) => (key === 'b' ? v.domain === 'B' : v.layer === key.toUpperCase()));
    const chosen = new Set((s.abc[key] || []).map(x => x.id));
    openDialog('调整 ' + key.toUpperCase(), `
      <p class="small muted">演示版：只在本页生效，不写库。</p>
      <div class="picker-list">${pool.map(([id, v]) => `<label class="item check">
        <input class="pick" type="checkbox" value="${esc(id)}" ${chosen.has(id) ? 'checked' : ''}>
        <span>${esc(v.label)} <span class="small muted">${esc(v.path || v.layer || '')}</span></span></label>`).join('')}</div>
      <div class="toolbar">${button('保存选择', 'save-abc', key, 'primary')}</div>`, true);
  },
  'save-abc': key => {
    const s = subOf(state.pid, state.sid);
    const ids = $$('dialog[open] .pick:checked').map(x => x.value);
    s.abc[key] = ids.map(id => ({ id, label: D.labels.terms[id]?.label || D.labels.nodes[id]?.label || id }));
    $('dialog[open]')?.close(); renderSub(); toast('ABC 已调整（演示版，不写库）');
  },
  'save-sub': () => {
    const s = subOf(state.pid, state.sid);
    s.title = $('#sTitle').value.trim() || s.title;
    s.category_l3 = $('#sCategory').value.trim();
    s.price_target = $('#sPrice').value === '' ? null : Number($('#sPrice').value);
    renderSub(); toast('条件已保存（演示版，不写库）');
  },
  'save-filters': () => { renderSub(); toast('筛选已更新（演示版：候选为预置结果，本地只做显示过滤）'); },
  'reset-filters': () => { renderSub(); toast('已恢复默认硬筛（演示版）'); },
  'refresh-rec': () => { renderRec(subOf(state.pid, state.sid)); toast('已刷新：演示版复用预置候选，不重新计算'); },
  shortlist: id => { state.local.decisions[id] = 'shortlist'; renderRec(subOf(state.pid, state.sid)); toast('已加入短名单（演示版）'); },
  eliminate: id => { state.local.decisions[id] = 'eliminated'; renderRec(subOf(state.pid, state.sid)); toast('已淘汰（演示版）'); },
  'rec-detail': id => {
    const s = subOf(state.pid, state.sid);
    const x = s.rec.items.find(i => i.id === id);
    openDialog(`${x.code} · ${x.name}`, `<p>${esc(x.reason)}</p>
      <div class="grid">
        <div><h3>直接命中</h3><div class="chips">${(x.ab_hits || []).map(h => chip(h.label)).join('') || '<span class="small muted">无</span>'}</div></div>
        <div><h3>候选 C → 映射到需求 AB</h3><div class="chips">${(x.mapped_hits || []).map(h => chip(h.label, 'blue')).join('') || '<span class="small muted">无</span>'}</div></div>
      </div><div class="hr"></div><h3>候选自身的 ABC</h3>
      ${['A', 'B', 'C'].map(d => `<p><strong>${d}</strong> ${esc((x.abc || []).filter(t => t.domain === d).map(t => t.label).join(' / ') || '无')}</p>`).join('')}`, true);
  },
  'select-codes': () => {
    const s = subOf(state.pid, state.sid);
    const picked = $$('#recBox .rec-select:checked').map(e => e.value);
    const typed = ($('#selectedCodes')?.value || '').split(/[，,\s]+/).filter(Boolean);
    const codes = [...new Set([...picked, ...typed])];
    if (!codes.length) return toast('先勾选候选或填写内部编号');
    state.local.selected[s.id] = codes; s.selected = codes;
    renderSub(); toast(`已选定 ${codes.join('、')}（演示版：真实系统会派发打样工单）`);
  },
  'edit-task': id => {
    const s = subOf(state.pid, state.sid), t = s.tasks.find(x => x.id === id);
    openDialog(t.title || t.type, `<label class="field">状态<select id="tStatus">
        ${['todo', 'doing', 'waiting', 'done'].map(k => `<option value="${k}" ${(state.local.tasks[t.id] || t.status) === k ? 'selected' : ''}>${STATUSES[k]}</option>`).join('')}</select></label>
      <label class="field">结果 / 交付说明<textarea id="tResult">${esc(t.result)}</textarea></label>
      <p class="small muted">演示版：状态只在页面内变化；真实系统会校验前置、写入快照并自动接续下一张工单。</p>
      <div class="toolbar">${button('保存', 'save-task', t.id, 'primary')}</div>`);
  },
  'save-task': id => {
    const s = subOf(state.pid, state.sid), t = s.tasks.find(x => x.id === id);
    const st = $('#tStatus').value, res = $('#tResult').value;
    if (['doing', 'done'].includes(st)) {
      const blocked = (t.deps || []).filter(d => {
        const dt = s.tasks.find(x => x.id === d);
        return dt && (state.local.tasks[dt.id] || dt.status) !== 'done';
      });
      if (blocked.length) return toast('前置任务尚未完成，不能推进');
    }
    if (st === 'done' && !res.trim()) return toast('完成任务时请填写结果或交付说明');
    state.local.tasks[t.id] = st; t.result = res;
    $('dialog[open]')?.close(); renderSub(); toast('工单已更新（演示版，不写库）');
  },
  'check-ok': code => { state.local.checks[code] = 'confirmed'; renderSub(); toast('已确认（演示版）'); },
  'check-na': code => {
    const note = prompt('不适用原因（必填）'); if (!note) return;
    state.local.checks[code] = 'na'; renderSub(); toast('已标记不适用');
  },
  'new-sample': () => { const p = prompt('实际收到的样品名称'); if (!p) return; toast('已登记（演示版，不写库）'); },
  usage: () => {
    const p = proj(state.pid);
    openDialog('模型调用记录', `<p>共 ${p.llm_calls.length} 次调用（按时间倒序）</p>
      <div class="table-wrap"><table class="table compact"><thead><tr><th>时间</th><th>节点</th><th>模型</th><th>Tokens</th><th>耗时</th></tr></thead><tbody>
      ${p.llm_calls.map(c => `<tr><td>${esc(c.at)}</td>
        <td>${esc(({ understand_project_v3: '全景理解', parse_annotation_v3: '资料初步标注', parse_pdf_vision_v3: '扫描页识别', parse_multimodal_v3: '图片 / 音频识别', understand_project_v3_contract_repair: 'ABC 依据校验', understand_project_v3_coherence_repair: '跨轮一致性校验', qa: '项目问答' })[c.node] || c.node)}</td>
        <td>${esc(c.model)}</td><td>${num(c.tokens)}</td><td>${c.elapsed}s</td></tr>`).join('')}</tbody></table></div>`, true);
  },
  'endpoint-initial': () => {
    const s = subOf(state.pid, state.sid);
    const done = t => (state.local.tasks[t.id] || t.status) === 'done';
    const ship = s.tasks.find(t => t.type === '寄样');
    if (!ship || !done(ship)) return toast('先完成打样与寄样任务');
    const reason = prompt('评香初样放行说明（法规、稳定性、表现力仍需后续核对）');
    if (!reason) return;
    s.status = 'sample_initial'; renderSub(); toast('已记录初样放行（演示版）');
  },
  'endpoint-final': () => {
    const s = subOf(state.pid, state.sid);
    const done = t => (state.local.tasks[t.id] || t.status) === 'done';
    const blockers = [];
    const law = s.tasks.find(t => t.type === '法规'), qc = s.tasks.find(t => t.type === '质量');
    if (!law || !done(law)) blockers.push('法规任务未完成');
    if (!qc || !done(qc)) blockers.push('质量任务未完成');
    s.checks.forEach(c => { if ((state.local.checks[c.code] || c.status) === 'pending') blockers.push(c.label + ' 尚未核对'); });
    if (blockers.length) return openDialog('还有检查未完成', blockers.slice(0, 12).map(b => `<p>${esc(b)}</p>`).join('') + `<p class="small muted">共 ${blockers.length} 项。</p>`);
    s.status = 'sample_final'; renderSub(); toast('已记录终样（演示版）');
  },
  'new-sub': () => openDialog('手工添加子项目', '<p class="small muted">演示版不新增子项目。</p>'),
  'follow-up': () => openDialog('创建关联后续', '<p class="small muted">演示版不新建子项目。真实系统里会新建一个改香项，指向当前项并继承仍然有效的条件。</p>'),
  gen: () => toast('演示环境不调用模型'),
  qa: () => toast('演示环境不调用模型'),
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  try { fn(el.dataset.id, e); } catch (err) { toast(err.message || '操作未完成'); }
});

document.addEventListener('input', e => {
  if (e.target.id === 'elastic') { const o = $('#elasticValue'); if (o) o.textContent = e.target.value; }
});

/* ---------------- 顶栏 ---------------- */
$('#homeBtn').onclick = () => go('');
$('#tagsBtn').onclick = () => go('tags');
$('#libBtn').onclick = () => openLibrary();
$('#newBtn').onclick = () => openDialog('新建项目', '<p class="small muted">演示环境不开放新建项目。</p>');
$('#helpBtn').onclick = () => openDialog('使用说明', `
  <p>演示环境：版面、字段与交互流程与原系统一致，数据取自真实运行记录。</p>
  <h3>可用</h3>
  <p class="small">项目切换、资料查看、简报、子项目、ABC 调整、候选短名单 / 淘汰 / 详情、香精库检索、评香选定、工单状态推进（含前置校验）、检查项确认与「不适用」、初样 / 终样放行（含阻断提示）。</p>
  <h3>不可用（需模型）</h3>
  <p class="small">上传资料、开始生成、问项目、重新解析。这些按钮是禁用态，鼠标悬停会说明原因。</p>
  <h3>说明</h3>
  <p class="small">带 <span class="hint" data-tip="气泡说明">?</span> 的项可悬停查看解释；页面内所有「保存」仅作用于当前会话，不写库。</p>`, true);

window.addEventListener('hashchange', route);
route();
