// voice-yakureki v5.4.0 Admin.jsx
// 管理画面: 店舗管理 / ユーザー管理 / API設定 / 使用統計（Phase A リニューアル）
import { useState, useEffect, useCallback, Fragment } from "react";
import { supabase } from "./supabase";
import { 
  Building2, Users, Key, BarChart3, Plus, Trash2, Edit3, Save, X, 
  ArrowLeft, Shield, ShieldCheck, UserCheck, Loader2, RefreshCw,
  CheckCircle, XCircle, Copy, Eye, EyeOff, LogOut, ChevronDown, Check,
  Settings
} from "lucide-react";

// === Styles ===
const S = {
  page: { minHeight:"100vh", background:"linear-gradient(168deg,#f0f1ff 0%,#f0f9ff 40%,#fafbfc 100%)", fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif" },
  header: { background:"#0f172a", borderBottom:"1px solid #1e293b", padding:"0 16px", position:"sticky", top:0, zIndex:50 },
  headerInner: { maxWidth:960, margin:"0 auto", display:"flex", alignItems:"center", height:54, gap:10 },
  headerIcon: { width:32, height:32, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center" },
  headerTitle: { fontSize:15, fontWeight:800, color:"#fff" },
  headerSub: { fontSize:9, color:"#64748b", fontWeight:600 },
  main: { maxWidth:960, margin:"0 auto", padding:"20px 16px 80px" },
  card: { background:"#fff", borderRadius:14, padding:"18px 20px", border:"1px solid #e8ecf0", marginBottom:14, boxShadow:"0 1px 4px rgba(0,0,0,.03)" },
  cardTitle: { fontSize:15, fontWeight:800, color:"#0f172a", marginBottom:12, display:"flex", alignItems:"center", gap:8 },
  tabs: { display:"flex", gap:4, background:"#f1f5f9", borderRadius:12, padding:4, marginBottom:16 },
  tab: (active) => ({ flex:1, padding:"10px 8px", border:"none", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", background:active?"#fff":"transparent", color:active?"#0f172a":"#94a3b8", display:"flex", alignItems:"center", justifyContent:"center", gap:6, boxShadow:active?"0 1px 3px rgba(0,0,0,.06)":"none", transition:"all 0.15s" }),
  btn: (color="#0d9488") => ({ background:`linear-gradient(135deg,${color},${color}dd)`, color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }),
  btnOutline: { background:"#fff", color:"#64748b", border:"1px solid #e2e8f0", borderRadius:10, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 },
  btnDanger: { background:"#fff", color:"#ef4444", border:"1px solid #fecaca", borderRadius:10, padding:"6px 12px", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 },
  input: { width:"100%", padding:"10px 12px", border:"2px solid #e2e8f0", borderRadius:10, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  inputSmall: { padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  label: { fontSize:11, fontWeight:700, color:"#475569", display:"block", marginBottom:4 },
  badge: (color, bg) => ({ fontSize:10, fontWeight:700, color, background:bg, padding:"2px 8px", borderRadius:6 }),
  table: { width:"100%", borderCollapse:"collapse", fontSize:12 },
  th: { textAlign:"left", padding:"8px 10px", fontSize:11, fontWeight:700, color:"#94a3b8", borderBottom:"1px solid #e2e8f0" },
  td: { padding:"10px", borderBottom:"1px solid #f1f5f9", color:"#334155" },
  empty: { textAlign:"center", padding:"40px 20px", color:"#94a3b8", fontSize:13 },
  stat: { textAlign:"center", padding:"16px" },
  statNum: { fontSize:28, fontWeight:900, color:"#0f172a", lineHeight:1 },
  statLabel: { fontSize:11, color:"#94a3b8", fontWeight:600, marginTop:4 },
  modal: { position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modalBox: { background:"#fff", borderRadius:16, padding:24, width:"100%", maxWidth:480, maxHeight:"85vh", overflow:"auto" },
};

// === Role Labels ===
const ROLE_LABELS = { super_admin:"全体管理者", store_admin:"店舗管理者", pharmacist:"薬剤師" };
const ROLE_COLORS = { 
  super_admin:{ color:"#7c3aed", bg:"#f3e8ff" }, 
  store_admin:{ color:"#0d9488", bg:"#ecfdf5" }, 
  pharmacist:{ color:"#2563eb", bg:"#eff6ff" } 
};
const ROLE_ICONS = { super_admin: ShieldCheck, store_admin: Shield, pharmacist: UserCheck };

// === Store Form Modal ===
function StoreFormModal({ store, companies, onClose, onSave }) {
  const [form, setForm] = useState({
    name: store?.name || "",
    name_kana: store?.name_kana || "",
    company_id: store?.company_id || (companies?.[0]?.id || ""),
    max_users: store?.max_users || 10,
    memo: store?.memo || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    if (!form.name.trim()) { setErr("店舗名を入力してください"); return; }
    if (!form.company_id) { setErr("会社を選択してください"); return; }
    setSaving(true); setErr("");
    try {
      const payload = { name: form.name, name_kana: form.name_kana, company_id: form.company_id, max_users: form.max_users, memo: form.memo };
      if (store) {
        const { error } = await supabase.from("stores").update(payload).eq("id", store.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stores").insert(payload);
        if (error) throw error;
      }
      onSave();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800 }}>{store ? "店舗を編集" : "新しい店舗を追加"}</h3>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", borderRadius:8, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}><X size={15} color="#64748b"/></button>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={S.label}>店舗名（漢字） *</label>
          <input style={S.input} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="例: ○○薬局 本店" />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={S.label}>店舗名（フリガナ）</label>
          <input style={S.input} value={form.name_kana} onChange={e => setForm(p => ({...p, name_kana: e.target.value}))} placeholder="例: まるまるやっきょく ほんてん" />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={S.label}>所属会社 *</label>
          <select style={S.input} value={form.company_id} onChange={e => setForm(p => ({...p, company_id: e.target.value}))}>
            <option value="">選択してください</option>
            {(companies||[]).map(c => <option key={c.id} value={c.id}>{c.name} ({c.company_code})</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:12, marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <label style={S.label}>最大ユーザー数</label>
            <input style={S.input} type="number" min={1} max={100} value={form.max_users} onChange={e => setForm(p => ({...p, max_users: parseInt(e.target.value) || 10}))} />
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={S.label}>メモ</label>
          <textarea style={{...S.input, resize:"vertical"}} rows={2} value={form.memo} onChange={e => setForm(p => ({...p, memo: e.target.value}))} placeholder="管理者向けメモ" />
        </div>
        {err && <div style={{ fontSize:11, color:"#dc2626", marginBottom:8, padding:"6px 10px", background:"#fef2f2", borderRadius:8 }}>{err}</div>}
        <button onClick={handleSave} disabled={saving} style={S.btn()}>
          {saving ? <Loader2 size={14} style={{ animation:"spin 1s linear infinite" }}/> : <Save size={14}/>}
          {store ? "更新" : "追加"}
        </button>
      </div>
    </div>
  );
}

// === User Add Modal ===
function UserAddModal({ stores, onClose, onSave }) {
  const [form, setForm] = useState({ email: "", password: "", store_id: "", role: "pharmacist" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    if (!form.email || !form.password) { setErr("メールアドレスとパスワードを入力してください"); return; }
    if (!form.store_id) { setErr("所属店舗を選択してください"); return; }
    setSaving(true); setErr("");
    try {
      // 1. Supabase Authでユーザー作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("ユーザーIDが取得できません");

      // 2. usersテーブルに追加
      const { error: userError } = await supabase.from("users").insert({
        id: userId,
        email: form.email,
        role: form.role === "store_admin" ? "store_admin" : "pharmacist",
        display_name: form.email.split("@")[0],
      });
      if (userError) throw userError;

      // 3. user_storesに紐付け
      const { error: linkError } = await supabase.from("user_stores").insert({
        user_id: userId,
        store_id: form.store_id,
        role: form.role,
      });
      if (linkError) throw linkError;

      onSave();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800 }}>新しいユーザーを追加</h3>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", borderRadius:8, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}><X size={15} color="#64748b"/></button>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={S.label}>メールアドレス *</label>
          <input style={S.input} type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="user@example.com" />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={S.label}>パスワード *</label>
          <input style={S.input} type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} placeholder="6文字以上" />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={S.label}>所属店舗 *</label>
          <select style={{...S.input, cursor:"pointer"}} value={form.store_id} onChange={e => setForm(p => ({...p, store_id: e.target.value}))}>
            <option value="">選択してください</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={S.label}>権限</label>
          <select style={{...S.input, cursor:"pointer"}} value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
            <option value="pharmacist">薬剤師</option>
            <option value="store_admin">店舗管理者</option>
          </select>
        </div>
        {err && <div style={{ fontSize:11, color:"#dc2626", marginBottom:8, padding:"6px 10px", background:"#fef2f2", borderRadius:8 }}>{err}</div>}
        <button onClick={handleSave} disabled={saving} style={S.btn()}>
          {saving ? <Loader2 size={14} style={{ animation:"spin 1s linear infinite" }}/> : <Plus size={14}/>}
          ユーザーを作成
        </button>
        <div style={{ marginTop:10, fontSize:10, color:"#94a3b8", lineHeight:1.6 }}>
          ※ 作成されたアカウントのメールアドレスとパスワードを店舗に共有してください
        </div>
      </div>
    </div>
  );
}

// === User Edit Modal ===
function UserEditModal({ user, stores, onClose, onSave }) {
  const [form, setForm] = useState({
    display_name: user.display_name || "",
    employee_id: user.employee_id || "",
    role: user.role || "pharmacist",
    store_id: user.user_stores?.[0]?.store_id || "",
    is_approved: user.is_approved !== false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    setSaving(true); setErr("");
    try {
      const { error } = await supabase.from("users").update({
        display_name: form.display_name,
        employee_id: form.employee_id,
        role: form.role,
        is_approved: form.is_approved,
      }).eq("id", user.id);
      if (error) throw error;

      // 店舗紐付け変更
      if (form.store_id) {
        await supabase.from("user_stores").delete().eq("user_id", user.id);
        await supabase.from("user_stores").insert({ user_id: user.id, store_id: form.store_id, role: form.role === "store_admin" ? "store_admin" : "pharmacist" });
      }
      onSave();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800 }}>ユーザーを編集</h3>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", borderRadius:8, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}><X size={15} color="#64748b"/></button>
        </div>
        <div style={{ fontSize:12, color:"#64748b", marginBottom:12, padding:"6px 10px", background:"#f8fafc", borderRadius:8 }}>{user.email}</div>
        <div style={{ marginBottom:10 }}>
          <label style={S.label}>氏名</label>
          <input style={S.input} value={form.display_name} onChange={e => setForm(p => ({...p, display_name: e.target.value}))} placeholder="氏名" />
        </div>
        <div style={{ marginBottom:10 }}>
          <label style={S.label}>社員番号</label>
          <input style={S.input} value={form.employee_id} onChange={e => setForm(p => ({...p, employee_id: e.target.value}))} placeholder="社員番号" />
        </div>
        <div style={{ marginBottom:10 }}>
          <label style={S.label}>ロール</label>
          <select style={S.input} value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
            <option value="pharmacist">薬剤師</option>
            <option value="store_admin">店舗管理者</option>
            <option value="super_admin">全体管理者</option>
          </select>
        </div>
        <div style={{ marginBottom:10 }}>
          <label style={S.label}>所属店舗</label>
          <select style={S.input} value={form.store_id} onChange={e => setForm(p => ({...p, store_id: e.target.value}))}>
            <option value="">未所属</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#475569", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <input type="checkbox" checked={form.is_approved} onChange={e => setForm(p => ({...p, is_approved: e.target.checked}))} style={{ width:16, height:16 }}/>
            承認済み
          </label>
        </div>
        {err && <div style={{ fontSize:11, color:"#dc2626", marginBottom:8, padding:"6px 10px", background:"#fef2f2", borderRadius:8 }}>{err}</div>}
        <button onClick={handleSave} disabled={saving} style={S.btn()}>
          {saving ? <Loader2 size={14} style={{ animation:"spin 1s linear infinite" }}/> : <Save size={14}/>}
          保存
        </button>
      </div>
    </div>
  );
}

// === API Key Section ===
function ApiKeySection({ apiKeys, onRefresh }) {
  const [showKey, setShowKey] = useState({});
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleShow = (id) => setShowKey(p => ({...p, [id]: !p[id]}));
  const startEdit = (key) => { setEditing(key.id); setEditVal(key.api_key); };
  const cancelEdit = () => { setEditing(null); setEditVal(""); };

  const saveKey = async (id) => {
    setSaving(true);
    try {
      await supabase.from("api_keys").update({ api_key: editVal, updated_at: new Date().toISOString() }).eq("id", id);
      setEditing(null); setEditVal("");
      onRefresh();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const addKey = async (service) => {
    const labels = { groq: "Groq（音声認識）", anthropic: "Anthropic（SOAP分類）" };
    const key = prompt(`${labels[service] || service} APIキーを入力:`);
    if (!key) return;
    try {
      await supabase.from("api_keys").insert({ store_id: null, service, api_key: key, is_active: true });
      onRefresh();
    } catch (e) { alert(e.message); }
  };

  const services = ["groq", "anthropic"];
  const serviceLabels = { groq: "Groq（音声認識・Whisper）", anthropic: "Anthropic（SOAP分類・Haiku）" };

  return (
    <div>
      {services.map(svc => {
        const key = apiKeys.find(k => k.service === svc && !k.store_id);
        return (
          <div key={svc} style={{ background:"#f8fafc", borderRadius:10, padding:"12px 14px", marginBottom:10, border:"1px solid #e2e8f0" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:"#334155" }}>{serviceLabels[svc]}</span>
              {key ? (
                <span style={S.badge("#059669","#ecfdf5")}>
                  <CheckCircle size={10} style={{ marginRight:3, verticalAlign:"middle" }}/> 設定済み
                </span>
              ) : (
                <span style={S.badge("#ef4444","#fef2f2")}>
                  <XCircle size={10} style={{ marginRight:3, verticalAlign:"middle" }}/> 未設定
                </span>
              )}
            </div>
            {key ? (
              editing === key.id ? (
                <div style={{ display:"flex", gap:6 }}>
                  <input style={{...S.inputSmall, flex:1, fontFamily:"monospace", fontSize:11}} value={editVal} onChange={e => setEditVal(e.target.value)} />
                  <button onClick={() => saveKey(key.id)} disabled={saving} style={{...S.btn(), padding:"6px 12px", fontSize:11}}>
                    <Save size={12}/> 保存
                  </button>
                  <button onClick={cancelEdit} style={{...S.btnOutline, padding:"6px 10px", fontSize:11}}>
                    <X size={12}/>
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <code style={{ flex:1, fontSize:10, color:"#64748b", background:"#f1f5f9", padding:"4px 8px", borderRadius:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {showKey[key.id] ? key.api_key : key.api_key.substring(0, 12) + "•••••••••••••"}
                  </code>
                  <button onClick={() => toggleShow(key.id)} style={{...S.btnOutline, padding:"4px 8px", fontSize:10}}>
                    {showKey[key.id] ? <EyeOff size={12}/> : <Eye size={12}/>}
                  </button>
                  <button onClick={() => startEdit(key)} style={{...S.btnOutline, padding:"4px 8px", fontSize:10}}>
                    <Edit3 size={12}/>
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(key.api_key)} style={{...S.btnOutline, padding:"4px 8px", fontSize:10}}>
                    <Copy size={12}/>
                  </button>
                </div>
              )
            ) : (
              <button onClick={() => addKey(svc)} style={{...S.btn("#6366f1"), fontSize:11, padding:"6px 12px"}}>
                <Plus size={12}/> キーを追加
              </button>
            )}
          </div>
        );
      })}
      <div style={{ fontSize:10, color:"#94a3b8", lineHeight:1.6, marginTop:8 }}>
        ※ グローバル設定のAPIキーは全店舗共通で使用されます。店舗ごとに別キーを使う場合は、店舗設定から個別に登録できます。
      </div>
    </div>
  );
}

// === Usage Stats (Phase A リニューアル) ===
const DAYS_JP = ["日","月","火","水","木","金","土"];
const fmtDur = (sec) => {
  if (!sec) return "0秒";
  if (sec < 60) return `${sec}秒`;
  if (sec < 3600) return `${Math.floor(sec/60)}分${sec%60}秒`;
  return `${Math.floor(sec/3600)}時間${Math.floor((sec%3600)/60)}分`;
};
const fmtDateShort = (d) => `${d.getMonth()+1}/${d.getDate()}`;
const toJSTDate = (d) => { const t = new Date(d); t.setHours(t.getHours()+9); return t.toISOString().slice(0,10); };

// ヒートマップの色（0〜1の強度 → 色）
const heatColor = (intensity) => {
  if (intensity === 0) return "#f8fafc";
  if (intensity < 0.2) return "#e0e7ff";
  if (intensity < 0.4) return "#c7d2fe";
  if (intensity < 0.6) return "#a5b4fc";
  if (intensity < 0.8) return "#818cf8";
  return "#6366f1";
};

function UsageStats({ stores, companies }) {
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [view, setView] = useState("overview"); // overview | heatmap | calendar
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterStore, setFilterStore] = useState("all");
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; });

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 1;
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

      let q = supabase.from("hourly_stats").select("*").gte("stat_date", since);
      if (filterCompany !== "all") q = q.eq("company_id", filterCompany);
      if (filterStore !== "all") q = q.eq("store_id", filterStore);

      const { data, error } = await q.order("stat_date", { ascending: true });
      if (error) throw error;
      setHourlyData(data || []);
    } catch (e) {
      console.error("Stats load error:", e);
      setHourlyData([]);
    }
    setLoading(false);
  }, [period, filterCompany, filterStore]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // === 集計 ===
  const totalRecords = hourlyData.reduce((a, r) => a + r.record_count, 0);
  const totalDuration = hourlyData.reduce((a, r) => a + r.total_duration_sec, 0);
  const uniqueDates = [...new Set(hourlyData.map(r => r.stat_date))];
  const activeStores = [...new Set(hourlyData.filter(r => r.store_id).map(r => r.store_id))];
  const allUsers = new Set();
  hourlyData.forEach(r => (r.user_ids || []).forEach(u => allUsers.add(u)));

  // 店舗別集計
  const byStore = {};
  hourlyData.forEach(r => {
    const sid = r.store_id || "unlinked";
    if (!byStore[sid]) byStore[sid] = { count: 0, duration: 0 };
    byStore[sid].count += r.record_count;
    byStore[sid].duration += r.total_duration_sec;
  });
  const storeRanking = Object.entries(byStore)
    .map(([id, d]) => ({ id, ...d, name: stores.find(s => s.id === id)?.name || "未紐付け" }))
    .sort((a, b) => b.count - a.count);
  const maxStoreCount = Math.max(...storeRanking.map(s => s.count), 1);

  // 日別集計
  const byDate = {};
  hourlyData.forEach(r => {
    if (!byDate[r.stat_date]) byDate[r.stat_date] = { count: 0, duration: 0 };
    byDate[r.stat_date].count += r.record_count;
    byDate[r.stat_date].duration += r.total_duration_sec;
  });
  const sortedDates = Object.keys(byDate).sort();
  const maxDayCount = Math.max(...Object.values(byDate).map(d => d.count), 1);

  // ヒートマップ集計 (曜日 × 時間帯)
  const heatmapGrid = Array.from({ length: 7 }, () => Array(24).fill(0));
  hourlyData.forEach(r => {
    const dayOfWeek = new Date(r.stat_date + "T00:00:00+09:00").getDay();
    heatmapGrid[dayOfWeek][r.stat_hour] += r.record_count;
  });
  const heatMax = Math.max(...heatmapGrid.flat(), 1);

  // カレンダー用: 月別日次データ
  const [calYear, calMonthNum] = calMonth.split("-").map(Number);
  const calFirstDay = new Date(calYear, calMonthNum - 1, 1).getDay();
  const calDaysInMonth = new Date(calYear, calMonthNum, 0).getDate();
  const calData = {};
  hourlyData.forEach(r => {
    if (r.stat_date.startsWith(calMonth)) {
      const day = parseInt(r.stat_date.slice(8, 10));
      if (!calData[day]) calData[day] = { count: 0, duration: 0 };
      calData[day].count += r.record_count;
      calData[day].duration += r.total_duration_sec;
    }
  });
  const calMaxCount = Math.max(...Object.values(calData).map(d => d.count), 1);

  // フィルタ連動: 会社選択時の店舗リスト
  const filteredStores = filterCompany === "all" ? stores : stores.filter(s => s.company_id === filterCompany);

  const PeriodBtn = ({ id, label }) => (
    <button onClick={() => setPeriod(id)} style={{
      padding:"5px 12px", borderRadius:8, border:`1px solid ${period===id?"#6366f1":"#e2e8f0"}`,
      background:period===id?"#eef2ff":"#fff", color:period===id?"#4f46e5":"#64748b",
      fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.15s"
    }}>{label}</button>
  );

  const ViewBtn = ({ id, label }) => (
    <button onClick={() => setView(id)} style={{
      padding:"6px 14px", borderRadius:8, border:"none",
      background:view===id?"#6366f1":"transparent", color:view===id?"#fff":"#94a3b8",
      fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.15s"
    }}>{label}</button>
  );

  if (loading) return <div style={{ textAlign:"center", padding:30 }}><Loader2 size={24} style={{ animation:"spin 1s linear infinite", color:"#94a3b8" }}/></div>;

  return (
    <div>
      {/* フィルター行 */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", gap:4, marginBottom:10 }}>
          {[{id:"1d",l:"今日"},{id:"7d",l:"7日間"},{id:"30d",l:"30日間"},{id:"90d",l:"90日間"}].map(p => (
            <PeriodBtn key={p.id} id={p.id} label={p.l}/>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {(companies||[]).length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <Building2 size={13} color="#6366f1"/>
              <select value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setFilterStore("all"); }} style={{
                padding:"6px 10px", borderRadius:8, border:"2px solid #e2e8f0", fontSize:12, fontWeight:700, color:"#0f172a", cursor:"pointer", outline:"none", background:"#fff", minWidth:100
              }}>
                {(companies||[]).length > 1 && <option value="all">全社</option>}
                {(companies||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {filterCompany !== "all" && filteredStores.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:11, color:"#94a3b8" }}>›</span>
              <select value={filterStore} onChange={e => setFilterStore(e.target.value)} style={{
                padding:"6px 10px", borderRadius:8, border:"2px solid #e2e8f0", fontSize:12, fontWeight:700, color:"#0f172a", cursor:"pointer", outline:"none", background:"#fff", minWidth:120
              }}>
                <option value="all">全店舗（{filteredStores.length}店の合計）</option>
                {filteredStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {filterCompany === "all" && stores.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:11, color:"#94a3b8" }}>›</span>
              <select value={filterStore} onChange={e => setFilterStore(e.target.value)} style={{
                padding:"6px 10px", borderRadius:8, border:"2px solid #e2e8f0", fontSize:12, fontWeight:700, color:"#0f172a", cursor:"pointer", outline:"none", background:"#fff", minWidth:120
              }}>
                <option value="all">全店舗</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* サマリーカード */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8, marginBottom:16 }}>
        {[
          { num: totalRecords, label: "録音件数", color: "#6366f1" },
          { num: fmtDur(totalDuration), label: "録音時間", color: "#0d9488" },
          { num: activeStores.length, label: "稼働店舗", color: "#d97706" },
          { num: allUsers.size, label: "利用者数", color: "#db2777" },
        ].map((c, i) => (
          <div key={i} style={{ background:"#fff", borderRadius:12, padding:"14px 8px", border:"1px solid #e8ecf0", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.03)" }}>
            <div style={{ fontSize:22, fontWeight:900, color:c.color, lineHeight:1 }}>{c.num}</div>
            <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600, marginTop:4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* ビュー切替 */}
      <div style={{ display:"flex", background:"#f1f5f9", borderRadius:10, padding:3, marginBottom:16, gap:2 }}>
        <ViewBtn id="overview" label="概要"/>
        <ViewBtn id="heatmap" label="ヒートマップ"/>
        <ViewBtn id="calendar" label="カレンダー"/>
      </div>

      {/* ========== 概要ビュー ========== */}
      {view === "overview" && (
        <div>
          {/* 日別推移 */}
          {sortedDates.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#475569", marginBottom:10 }}>日別推移</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:100, padding:"0 2px" }}>
                {sortedDates.map(date => {
                  const d = byDate[date];
                  const h = Math.max((d.count / maxDayCount) * 90, 4);
                  const dt = new Date(date + "T00:00:00+09:00");
                  return (
                    <div key={date} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", minWidth:0 }} title={`${fmtDateShort(dt)}: ${d.count}件 / ${fmtDur(d.duration)}`}>
                      <div style={{ width:"100%", maxWidth:24, height:h, background:"linear-gradient(180deg,#818cf8,#6366f1)", borderRadius:"4px 4px 0 0", transition:"height 0.3s" }}/>
                      {sortedDates.length <= 14 && (
                        <div style={{ fontSize:8, color:"#94a3b8", marginTop:2, whiteSpace:"nowrap" }}>{fmtDateShort(dt)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {sortedDates.length > 14 && (
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                  <span style={{ fontSize:9, color:"#94a3b8" }}>{sortedDates[0]}</span>
                  <span style={{ fontSize:9, color:"#94a3b8" }}>{sortedDates[sortedDates.length-1]}</span>
                </div>
              )}
            </div>
          )}

          {/* 店舗別ランキング */}
          {storeRanking.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#475569", marginBottom:10 }}>店舗別</div>
              {storeRanking.map((s, i) => (
                <div key={s.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <div style={{ width:20, fontSize:12, fontWeight:800, color:i < 3 ? "#6366f1" : "#94a3b8", textAlign:"right" }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:"#334155", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:"#6366f1", whiteSpace:"nowrap", marginLeft:8 }}>{s.count}件</span>
                    </div>
                    <div style={{ height:6, background:"#f1f5f9", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${(s.count / maxStoreCount) * 100}%`, background:"linear-gradient(90deg,#818cf8,#6366f1)", borderRadius:3, transition:"width 0.3s" }}/>
                    </div>
                    <div style={{ fontSize:9, color:"#94a3b8", marginTop:2 }}>{fmtDur(s.duration)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalRecords === 0 && <div style={S.empty}>この期間のデータはありません</div>}
        </div>
      )}

      {/* ========== ヒートマップビュー ========== */}
      {view === "heatmap" && (
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:"#475569", marginBottom:10 }}>時間帯 × 曜日パターン</div>
          <div style={{ fontSize:10, color:"#94a3b8", marginBottom:12 }}>録音が多い時間帯を濃い色で表示</div>
          <div style={{ overflowX:"auto" }}>
            <div style={{ display:"grid", gridTemplateColumns:"32px repeat(24, 1fr)", gap:2, minWidth:540 }}>
              {/* ヘッダー行: 時間 */}
              <div/>
              {Array.from({length:24}, (_,h) => (
                <div key={h} style={{ fontSize:8, color:"#94a3b8", textAlign:"center", fontWeight:600 }}>
                  {h % 3 === 0 ? `${h}` : ""}
                </div>
              ))}
              {/* データ行: 曜日ごと */}
              {[1,2,3,4,5,6,0].map(dow => (
                <Fragment key={dow}>
                  <div style={{ fontSize:10, fontWeight:700, color:dow===0||dow===6?"#ef4444":"#475569", display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:4 }}>
                    {DAYS_JP[dow]}
                  </div>
                  {Array.from({length:24}, (_,h) => {
                    const val = heatmapGrid[dow][h];
                    const intensity = val / heatMax;
                    return (
                      <div key={`${dow}-${h}`} title={`${DAYS_JP[dow]}曜 ${h}時: ${val}件`} style={{
                        aspectRatio:"1", borderRadius:3, background:heatColor(intensity), cursor:"default",
                        transition:"background 0.2s", minHeight:14
                      }}/>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
          {/* 凡例 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4, marginTop:10 }}>
            <span style={{ fontSize:9, color:"#94a3b8" }}>少ない</span>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map(v => (
              <div key={v} style={{ width:14, height:14, borderRadius:3, background:heatColor(v) }}/>
            ))}
            <span style={{ fontSize:9, color:"#94a3b8" }}>多い</span>
          </div>
          {/* 時間帯サマリー */}
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#475569", marginBottom:6 }}>ピーク時間帯 TOP5</div>
            {(() => {
              const hourTotals = Array.from({length:24}, (_,h) => ({
                hour: h, total: heatmapGrid.reduce((a, row) => a + row[h], 0)
              })).sort((a,b) => b.total - a.total).slice(0, 5).filter(h => h.total > 0);
              return hourTotals.map((h, i) => (
                <div key={h.hour} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:11, fontWeight:800, color:i === 0 ? "#6366f1" : "#94a3b8", width:16 }}>{i+1}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"#334155" }}>{h.hour}:00〜{h.hour+1}:00</span>
                  <span style={{ fontSize:11, color:"#6366f1", fontWeight:600 }}>{h.total}件</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ========== カレンダービュー ========== */}
      {view === "calendar" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <button onClick={() => {
              const d = new Date(calYear, calMonthNum - 2, 1);
              setCalMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
            }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#6366f1", fontWeight:700 }}>‹</button>
            <div style={{ fontSize:14, fontWeight:800, color:"#0f172a" }}>{calYear}年{calMonthNum}月</div>
            <button onClick={() => {
              const d = new Date(calYear, calMonthNum, 1);
              setCalMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
            }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#6366f1", fontWeight:700 }}>›</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:2, marginBottom:4 }}>
            {DAYS_JP.map((d, i) => (
              <div key={d} style={{ fontSize:10, fontWeight:700, color:i===0||i===6?"#ef4444":"#94a3b8", textAlign:"center", padding:"4px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:2 }}>
            {/* 先頭の空セル */}
            {Array.from({length: calFirstDay}, (_, i) => <div key={`e${i}`}/>)}
            {/* 日付セル */}
            {Array.from({length: calDaysInMonth}, (_, i) => {
              const day = i + 1;
              const d = calData[day];
              const intensity = d ? d.count / calMaxCount : 0;
              const today = new Date();
              const isToday = calYear === today.getFullYear() && calMonthNum === today.getMonth()+1 && day === today.getDate();
              return (
                <div key={day} title={d ? `${day}日: ${d.count}件 / ${fmtDur(d.duration)}` : `${day}日: データなし`} style={{
                  aspectRatio:"1", borderRadius:6, background: d ? heatColor(intensity) : "#f8fafc",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  border: isToday ? "2px solid #6366f1" : "1px solid #e8ecf0",
                  cursor:"default", position:"relative", minHeight:36
                }}>
                  <div style={{ fontSize:11, fontWeight:isToday ? 800 : 600, color: d ? (intensity > 0.5 ? "#fff" : "#334155") : "#cbd5e1" }}>{day}</div>
                  {d && <div style={{ fontSize:7, fontWeight:700, color: intensity > 0.5 ? "#e0e7ff" : "#6366f1" }}>{d.count}件</div>}
                </div>
              );
            })}
          </div>
          {/* カレンダー月間サマリー */}
          {(() => {
            const monthTotal = Object.values(calData).reduce((a, d) => a + d.count, 0);
            const monthDur = Object.values(calData).reduce((a, d) => a + d.duration, 0);
            const activeDays = Object.keys(calData).length;
            return monthTotal > 0 ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginTop:12 }}>
                <div style={{ textAlign:"center", padding:10, background:"#f8fafc", borderRadius:8 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:"#6366f1" }}>{monthTotal}</div>
                  <div style={{ fontSize:9, color:"#94a3b8", fontWeight:600 }}>月間件数</div>
                </div>
                <div style={{ textAlign:"center", padding:10, background:"#f8fafc", borderRadius:8 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:"#0d9488" }}>{fmtDur(monthDur)}</div>
                  <div style={{ fontSize:9, color:"#94a3b8", fontWeight:600 }}>月間録音時間</div>
                </div>
                <div style={{ textAlign:"center", padding:10, background:"#f8fafc", borderRadius:8 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:"#d97706" }}>{activeDays}日</div>
                  <div style={{ fontSize:9, color:"#94a3b8", fontWeight:600 }}>稼働日数</div>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

// === Role Management (ロール管理) Phase B ===
const PERM_CATEGORIES = {
  recording: { label: "録音", color: "#059669", icon: "🎙️" },
  admin:     { label: "管理", color: "#6366f1", icon: "⚙️" },
  general:   { label: "一般", color: "#64748b", icon: "📋" },
};

function RolePanel({ onRefresh }) {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePerms, setRolePerms] = useState({}); // { roleId: [permId, ...] }
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | role object
  const [form, setForm] = useState({ name: "", description: "", color: "#6366f1" });
  const [formPerms, setFormPerms] = useState([]); // permission ids
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: rData }, { data: pData }, { data: rpData }] = await Promise.all([
        supabase.from("roles").select("*").order("sort_order").order("created_at"),
        supabase.from("permissions").select("*").order("sort_order"),
        supabase.from("role_permissions").select("role_id, permission_id"),
      ]);
      setRoles(rData || []);
      setPermissions(pData || []);
      const map = {};
      (rpData || []).forEach(rp => {
        if (!map[rp.role_id]) map[rp.role_id] = [];
        map[rp.role_id].push(rp.permission_id);
      });
      setRolePerms(map);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (role) => {
    if (role === "new") {
      setForm({ name: "", description: "", color: "#6366f1" });
      setFormPerms([]);
    } else {
      setForm({ name: role.name, description: role.description || "", color: role.color || "#6366f1" });
      setFormPerms(rolePerms[role.id] || []);
    }
    setEditing(role);
    setErr("");
  };

  const togglePerm = (pid) => {
    setFormPerms(prev => prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]);
  };

  const toggleCategory = (cat) => {
    const catPerms = permissions.filter(p => p.category === cat).map(p => p.id);
    const allChecked = catPerms.every(p => formPerms.includes(p));
    if (allChecked) {
      setFormPerms(prev => prev.filter(p => !catPerms.includes(p)));
    } else {
      setFormPerms(prev => [...new Set([...prev, ...catPerms])]);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setErr("ロール名を入力してください"); return; }
    setSaving(true);
    setErr("");
    try {
      let roleId;
      if (editing === "new") {
        const maxOrder = Math.max(...roles.map(r => r.sort_order || 0), 0);
        const { data, error } = await supabase.from("roles").insert({
          name: form.name.trim(),
          description: form.description.trim(),
          color: form.color,
          is_system: false,
          sort_order: maxOrder + 1,
        }).select().single();
        if (error) throw error;
        roleId = data.id;
      } else {
        const { error } = await supabase.from("roles").update({
          name: form.name.trim(),
          description: form.description.trim(),
          color: form.color,
          updated_at: new Date().toISOString(),
        }).eq("id", editing.id);
        if (error) throw error;
        roleId = editing.id;
        // 既存の権限を削除
        await supabase.from("role_permissions").delete().eq("role_id", roleId);
      }
      // 権限を挿入
      if (formPerms.length > 0) {
        const rows = formPerms.map(pid => ({ role_id: roleId, permission_id: pid }));
        const { error: rpErr } = await supabase.from("role_permissions").insert(rows);
        if (rpErr) throw rpErr;
      }
      setEditing(null);
      load();
      onRefresh?.();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  const handleDelete = async (role) => {
    if (role.is_system) return;
    if (!confirm(`ロール「${role.name}」を削除しますか？\nこのロールが割り当てられているユーザーのロールは解除されます。`)) return;
    try {
      await supabase.from("users").update({ role_id: null }).eq("role_id", role.id);
      await supabase.from("role_permissions").delete().eq("role_id", role.id);
      await supabase.from("roles").delete().eq("id", role.id);
      load();
      onRefresh?.();
    } catch (e) { console.error(e); }
  };

  const handleToggleActive = async (role) => {
    if (role.is_system) return;
    await supabase.from("roles").update({ is_active: !role.is_active }).eq("id", role.id);
    load();
  };

  // 権限をカテゴリでグループ化
  const permsByCategory = {};
  permissions.forEach(p => {
    if (!permsByCategory[p.category]) permsByCategory[p.category] = [];
    permsByCategory[p.category].push(p);
  });

  if (loading) return <div style={{ textAlign:"center", padding:30 }}><Loader2 size={24} style={{ animation:"spin 1s linear infinite", color:"#94a3b8" }}/></div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontSize:12, color:"#94a3b8" }}>ロール数: {roles.length}</div>
        <button onClick={() => openEdit("new")} style={S.btn()}>
          <Plus size={14}/> 新規ロール
        </button>
      </div>

      {/* ロール一覧 */}
      {roles.map(role => {
        const perms = (rolePerms[role.id] || []).map(pid => permissions.find(p => p.id === pid)).filter(Boolean);
        return (
          <div key={role.id} style={{...S.card, opacity: role.is_active ? 1 : 0.5 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:perms.length > 0 ? 10 : 0 }}>
              <div style={{ width:8, height:8, borderRadius:4, background:role.color || "#6366f1", flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:14, fontWeight:800, color:"#0f172a" }}>{role.name}</span>
                  {role.is_system && <span style={S.badge("#7c3aed","#f3e8ff")}>システム</span>}
                  {!role.is_active && <span style={S.badge("#ef4444","#fef2f2")}>無効</span>}
                </div>
                {role.description && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{role.description}</div>}
              </div>
              <div style={{ display:"flex", gap:4 }}>
                <button onClick={() => openEdit(role)} style={{...S.btnOutline, padding:"6px 10px"}}><Edit3 size={12}/></button>
                {!role.is_system && (
                  <>
                    <button onClick={() => handleToggleActive(role)} style={{...S.btnOutline, padding:"6px 10px"}}>
                      {role.is_active ? <XCircle size={12} color="#ef4444"/> : <CheckCircle size={12} color="#059669"/>}
                    </button>
                    <button onClick={() => handleDelete(role)} style={{...S.btnDanger, padding:"6px 10px"}}><Trash2 size={12}/></button>
                  </>
                )}
              </div>
            </div>
            {/* 権限バッジ */}
            {perms.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, paddingLeft:18 }}>
                {perms.map(p => {
                  const cat = PERM_CATEGORIES[p.category] || PERM_CATEGORIES.general;
                  return (
                    <span key={p.id} style={{ fontSize:10, fontWeight:600, color:cat.color, background:`${cat.color}12`, padding:"2px 7px", borderRadius:5, border:`1px solid ${cat.color}30` }}>
                      {p.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {roles.length === 0 && <div style={S.empty}>ロールがありません</div>}

      {/* ロール編集モーダル */}
      {editing !== null && (
        <div style={S.modal} onClick={() => setEditing(null)}>
          <div style={{...S.modalBox, maxWidth:560 }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:800, color:"#0f172a" }}>
                {editing === "new" ? "新規ロール作成" : `${editing.name} を編集`}
              </div>
              <button onClick={() => setEditing(null)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={20} color="#94a3b8"/></button>
            </div>

            {err && <div style={{ background:"#fef2f2", color:"#dc2626", padding:"8px 12px", borderRadius:8, fontSize:12, marginBottom:12 }}>{err}</div>}

            <div style={{ marginBottom:12 }}>
              <label style={S.label}>ロール名 *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={S.input} placeholder="例: エリアマネージャー" disabled={editing !== "new" && editing?.is_system}/>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>説明</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={S.input} placeholder="このロールの説明"/>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>バッジカラー</label>
              <div style={{ display:"flex", gap:6 }}>
                {["#6366f1","#7c3aed","#0d9488","#2563eb","#d97706","#db2777","#059669","#dc2626","#475569"].map(c => (
                  <button key={c} onClick={() => setForm({...form, color: c})} style={{
                    width:28, height:28, borderRadius:8, background:c, border: form.color === c ? "3px solid #0f172a" : "2px solid transparent", cursor:"pointer"
                  }}/>
                ))}
              </div>
            </div>

            {/* 権限設定 */}
            <div style={{ fontSize:13, fontWeight:800, color:"#0f172a", marginBottom:10 }}>権限設定</div>
            {Object.entries(permsByCategory).map(([cat, perms]) => {
              const catMeta = PERM_CATEGORIES[cat] || PERM_CATEGORIES.general;
              const allChecked = perms.every(p => formPerms.includes(p.id));
              const someChecked = perms.some(p => formPerms.includes(p.id));
              return (
                <div key={cat} style={{ marginBottom:14, background:"#f8fafc", borderRadius:10, padding:"10px 12px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, cursor:"pointer" }} onClick={() => toggleCategory(cat)}>
                    <div style={{
                      width:16, height:16, borderRadius:4, border:`2px solid ${allChecked ? catMeta.color : "#cbd5e1"}`,
                      background: allChecked ? catMeta.color : someChecked ? `${catMeta.color}40` : "#fff",
                      display:"flex", alignItems:"center", justifyContent:"center"
                    }}>
                      {(allChecked || someChecked) && <Check size={10} color="#fff"/>}
                    </div>
                    <span style={{ fontSize:12, fontWeight:800, color:catMeta.color }}>{catMeta.icon} {catMeta.label}</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, paddingLeft:22 }}>
                    {perms.map(p => {
                      const checked = formPerms.includes(p.id);
                      return (
                        <label key={p.id} style={{ display:"flex", alignItems:"flex-start", gap:6, cursor:"pointer", padding:"4px 0" }}>
                          <div style={{
                            width:15, height:15, borderRadius:4, border:`2px solid ${checked ? catMeta.color : "#cbd5e1"}`,
                            background: checked ? catMeta.color : "#fff", display:"flex", alignItems:"center", justifyContent:"center",
                            flexShrink:0, marginTop:1
                          }} onClick={() => togglePerm(p.id)}>
                            {checked && <Check size={9} color="#fff"/>}
                          </div>
                          <div onClick={() => togglePerm(p.id)}>
                            <div style={{ fontSize:11, fontWeight:700, color:"#334155" }}>{p.label}</div>
                            <div style={{ fontSize:9, color:"#94a3b8" }}>{p.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
              <button onClick={() => setEditing(null)} style={S.btnOutline}>キャンセル</button>
              <button onClick={handleSave} disabled={saving} style={S.btn()}>
                {saving ? <Loader2 size={14} style={{ animation:"spin 1s linear infinite" }}/> : <Save size={14}/>}
                {editing === "new" ? "作成" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Company Management (会社管理) ===
function CompanyPanel({ onRefresh }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", company_code: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*').order('created_at');
    setCompanies(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (c) => { setEditing(c.id); setForm({ name: c.name, company_code: c.company_code || "" }); setErr(""); };
  const startNew = () => { setEditing("new"); setForm({ name: "", company_code: "" }); setErr(""); };
  const cancel = () => { setEditing(null); setErr(""); };

  const save = async () => {
    if (!form.name.trim()) { setErr("会社名を入力してください"); return; }
    if (!form.company_code.trim()) { setErr("会社コードを入力してください"); return; }
    setSaving(true); setErr("");
    try {
      const payload = { name: form.name.trim(), company_code: form.company_code.trim().toUpperCase(), code: form.company_code.trim().toUpperCase() };
      if (editing === "new") {
        const { error } = await supabase.from('companies').insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('companies').update(payload).eq('id', editing);
        if (error) throw error;
      }
      setEditing(null); await load(); onRefresh();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  const toggleActive = async (id, isActive) => {
    await supabase.from('companies').update({ is_active: !isActive }).eq('id', id);
    await load(); onRefresh();
  };

  if (loading) return <div style={{ textAlign:"center", padding:30 }}><Loader2 size={24} style={{ animation:"spin 1s linear infinite", color:"#94a3b8" }}/></div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:800, color:"#0f172a" }}>登録企業 ({companies.length})</div>
        <button onClick={startNew} style={{ background:"linear-gradient(135deg,#0d9488,#0f766e)", color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
          <Plus size={14}/> 新規追加
        </button>
      </div>

      {editing && (
        <div style={{ background:"#f8fafc", borderRadius:12, padding:16, border:"1px solid #e2e8f0", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0f172a", marginBottom:10 }}>{editing === "new" ? "新しい企業を追加" : "企業を編集"}</div>
          <div style={{ marginBottom:8 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>会社名</label>
            <input style={{ width:"100%", padding:"9px 12px", border:"2px solid #e2e8f0", borderRadius:10, fontSize:13, outline:"none", boxSizing:"border-box" }} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="例: ○○薬局グループ" />
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>会社コード（ログイン時に使用）</label>
            <input style={{ width:"100%", padding:"9px 12px", border:"2px solid #e2e8f0", borderRadius:10, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"monospace", letterSpacing:2 }} value={form.company_code} onChange={e => setForm(p => ({...p, company_code: e.target.value}))} placeholder="例: AKAKABE" />
            <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>半角英数字。スタッフがログイン時に入力するコードです。</div>
          </div>
          {err && <div style={{ fontSize:11, color:"#dc2626", marginBottom:8, padding:"5px 8px", background:"#fef2f2", borderRadius:6 }}>{err}</div>}
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={save} disabled={saving} style={{ background:"linear-gradient(135deg,#0d9488,#0f766e)", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
              {saving ? <Loader2 size={12} style={{ animation:"spin 1s linear infinite" }}/> : <Save size={12}/>} 保存
            </button>
            <button onClick={cancel} style={{ background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer" }}>キャンセル</button>
          </div>
        </div>
      )}

      {companies.map(c => (
        <div key={c.id} style={{ background:"#fff", borderRadius:12, padding:"14px 18px", border:"1px solid #e8ecf0", marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Building2 size={20} color={c.is_active ? "#6366f1" : "#94a3b8"} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:c.is_active ? "#0f172a" : "#94a3b8" }}>{c.name}</div>
              <div style={{ fontSize:11, color:"#64748b" }}>
                コード: <span style={{ fontFamily:"monospace", fontWeight:700 }}>{c.company_code || "未設定"}</span>
                {!c.is_active && <span style={{ fontSize:10, fontWeight:700, color:"#ef4444", background:"#fef2f2", padding:"1px 6px", borderRadius:4, marginLeft:6 }}>無効</span>}
              </div>
            </div>
            <button onClick={() => startEdit(c)} style={{ background:"#f1f5f9", border:"none", borderRadius:8, padding:"6px 10px", cursor:"pointer" }}><Edit3 size={12} color="#64748b"/></button>
            <button onClick={() => toggleActive(c.id, c.is_active)} style={{ background:"#f1f5f9", border:"none", borderRadius:8, padding:"6px 10px", cursor:"pointer" }}>
              {c.is_active ? <XCircle size={12} color="#ef4444"/> : <CheckCircle size={12} color="#059669"/>}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// === Pending Users (申請一覧) ===
function PendingUsersPanel({ onRefresh }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').eq('is_approved', false).order('created_at', { ascending: false });
    setPending(data || []);
    setSelected(new Set());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === pending.length) setSelected(new Set());
    else setSelected(new Set(pending.map(u => u.id)));
  };

  const handleApprove = async () => {
    if (selected.size === 0) return;
    setProcessing(true);
    try {
      const ids = Array.from(selected);
      await supabase.from('users').update({ is_approved: true }).in('id', ids);
      await load();
      onRefresh();
    } catch (e) { alert(e.message); }
    setProcessing(false);
  };

  const handleReject = async (id) => {
    if (!confirm('この申請を拒否して削除しますか？')) return;
    try {
      await supabase.from('user_stores').delete().eq('user_id', id);
      await supabase.from('users').delete().eq('id', id);
      await load();
    } catch (e) { alert(e.message); }
  };

  const fmtDt = (d) => { const dt = new Date(d); return `${dt.getMonth()+1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2,'0')}`; };

  if (loading) return <div style={{ textAlign:"center", padding:30 }}><Loader2 size={24} style={{ animation:"spin 1s linear infinite", color:"#94a3b8" }}/></div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:800, color:"#0f172a" }}>承認待ち ({pending.length}件)</div>
        <div style={{ display:"flex", gap:6 }}>
          {pending.length > 0 && <button onClick={selectAll} style={{ background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:700, color:"#64748b", cursor:"pointer" }}>
            {selected.size === pending.length ? "全解除" : "全選択"}
          </button>}
          {selected.size > 0 && <button onClick={handleApprove} disabled={processing} style={{ background:"linear-gradient(135deg,#0d9488,#0f766e)", color:"#fff", border:"none", borderRadius:8, padding:"6px 14px", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
            {processing ? <Loader2 size={12} style={{ animation:"spin 1s linear infinite" }}/> : <CheckCircle size={12}/>}
            {selected.size}件を承認
          </button>}
        </div>
      </div>
      {pending.length === 0 ? (
        <div style={S.empty}>承認待ちの申請はありません</div>
      ) : (
        pending.map(u => (
          <div key={u.id} style={{...S.card, display:"flex", alignItems:"center", gap:10, cursor:"pointer"}} onClick={() => toggleSelect(u.id)}>
            <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${selected.has(u.id) ? "#0d9488" : "#d1d5db"}`, background:selected.has(u.id) ? "#0d9488" : "#fff", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", flexShrink:0 }}>
              {selected.has(u.id) && <Check size={14} color="#fff"/>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{u.display_name || "（名前未入力）"}</div>
              <div style={{ fontSize:11, color:"#64748b" }}>{u.email}</div>
              <div style={{ fontSize:10, color:"#94a3b8", display:"flex", gap:8, marginTop:2, flexWrap:"wrap" }}>
                {u.employee_id && <span>社員番号: {u.employee_id}</span>}
                <span>申請日: {fmtDt(u.created_at)}</span>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleReject(u.id); }} style={{ background:"#fff", color:"#ef4444", border:"1px solid #fecaca", borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
              拒否
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// === Main Admin Component ===
export default function Admin({ session, onBack }) {
  const [tab, setTab] = useState("stores");
  const [pendingCount, setPendingCount] = useState(0);
  const [stores, setStores] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStoreForm, setShowStoreForm] = useState(null); // null=closed, false=new, object=edit
  const [showUserAdd, setShowUserAdd] = useState(false);
  const [showUserEdit, setShowUserEdit] = useState(null); // null=closed, object=edit
  const [companiesList, setCompaniesList] = useState([]);
  const [storeFilterCompany, setStoreFilterCompany] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 自分のユーザー情報
      const { data: me } = await supabase.from("users").select("*").eq("email", session.user.email).single();
      setUserInfo(me);

      // super_adminでなければ管理画面にアクセス不可
      if (me?.role !== "super_admin" && me?.role !== "store_admin") {
        setLoading(false);
        return;
      }

      // 店舗一覧
      const { data: storeData } = await supabase.from("stores").select("*").order("created_at");
      setStores(storeData || []);

      // ユーザー一覧（user_storesとjoin）
      const { data: userData } = await supabase.from("users").select("*, user_stores(store_id, role, stores(name))").order("created_at");
      setUsersData(userData || []);

      // APIキー一覧
      const { data: keyData } = await supabase.from("api_keys").select("*").order("created_at");
      setApiKeys(keyData || []);

      // 企業一覧
      const { data: compData } = await supabase.from("companies").select("*").order("name");
      setCompaniesList(compData || []);

      // 申請件数
      const { count: pc } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("is_approved", false);
      setPendingCount(pc || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  // アクセス権チェック
  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Loader2 size={28} style={{ animation:"spin 1s linear infinite", color:"#6366f1" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!userInfo || (userInfo.role !== "super_admin" && userInfo.role !== "store_admin")) {
    return (
      <div style={S.page}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"80vh", gap:16 }}>
          <Shield size={48} color="#94a3b8"/>
          <div style={{ fontSize:16, fontWeight:800, color:"#334155" }}>アクセス権限がありません</div>
          <div style={{ fontSize:13, color:"#94a3b8" }}>管理者アカウントでログインしてください</div>
          <button onClick={onBack} style={S.btn()}>
            <ArrowLeft size={14}/> アプリに戻る
          </button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = userInfo.role === "super_admin";

  const handleDeleteStore = async (id) => {
    if (!confirm("この店舗を削除しますか？紐付いた履歴は残りますが、店舗情報は完全に削除されます。")) return;
    await supabase.from("stores").delete().eq("id", id);
    loadData();
  };

  const handleToggleStore = async (id, isActive) => {
    await supabase.from("stores").update({ is_active: !isActive }).eq("id", id);
    loadData();
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("このユーザーを削除しますか？")) return;
    await supabase.from("user_stores").delete().eq("user_id", userId);
    await supabase.from("users").delete().eq("id", userId);
    loadData();
  };

  const tabs = [
    { id:"pending", label:"申請", icon:UserCheck },
    { id:"company", label:"会社管理", icon:Building2 },
    { id:"stores", label:"店舗管理", icon:Building2 },
    { id:"users", label:"ユーザー", icon:Users },
    { id:"apikeys", label:"API設定", icon:Key },
    { id:"stats", label:"統計", icon:BarChart3 },
    { id:"roles", label:"ロール", icon:Settings },
  ];

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <header style={S.header}>
        <div style={S.headerInner}>
          <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
            <ArrowLeft size={16} color="#94a3b8"/>
            <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600 }}>アプリに戻る</span>
          </button>
          <div style={{ flex:1 }}/>
          <div style={S.headerIcon}><Shield size={16} color="#fff"/></div>
          <div>
            <div style={S.headerTitle}>管理画面</div>
            <div style={S.headerSub}>{userInfo.display_name || userInfo.email}</div>
          </div>
          <div style={{ flex:1 }}/>
          <button onClick={loadData} style={{ background:"#1e293b", border:"none", borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <RefreshCw size={14} color="#64748b"/>
          </button>
        </div>
      </header>

      <main style={S.main}>
        <div style={S.tabs}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{...S.tab(tab === t.id), position:"relative"}}>
              <t.icon size={14}/> {t.label}
              {t.id === "pending" && pendingCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:"#ef4444", color:"#fff", fontSize:9, fontWeight:800, borderRadius:10, minWidth:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>{pendingCount}</span>}
            </button>
          ))}
        </div>

        {/* ========== 店舗管理 ========== */}
        {tab === "stores" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#0f172a" }}>登録店舗 ({stores.length})</div>
              {isSuperAdmin && (
                <button onClick={() => setShowStoreForm(false)} style={S.btn()}>
                  <Plus size={14}/> 新規追加
                </button>
              )}
            </div>
            {/* ★ 会社フィルター */}
            {companiesList.length > 1 && (
              <div style={{ marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
                <Building2 size={14} color="#6366f1"/>
                <span style={{ fontSize:11, fontWeight:700, color:"#475569" }}>会社で絞り込み:</span>
                <select value={storeFilterCompany} onChange={e => setStoreFilterCompany(e.target.value)} style={{ flex:1, padding:"6px 10px", border:"2px solid #e2e8f0", borderRadius:8, fontSize:12, fontWeight:600, color:"#0f172a", outline:"none", cursor:"pointer" }}>
                  <option value="all">すべての会社</option>
                  {companiesList.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company_code})</option>)}
                </select>
              </div>
            )}
            {(() => {
              const filtered = storeFilterCompany === "all" ? stores : stores.filter(s => s.company_id === storeFilterCompany);
              return filtered.length === 0 ? (
              <div style={S.empty}>まだ店舗が登録されていません</div>
            ) : (
              filtered.map(s => (
                <div key={s.id} style={S.card}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <Building2 size={20} color={s.is_active ? "#0d9488" : "#94a3b8"}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:800, color:s.is_active ? "#0f172a" : "#94a3b8" }}>{s.name}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>
                        {s.name_kana && <span style={{ marginRight:8 }}>{s.name_kana}</span>}
                        最大{s.max_users}名
                        {!s.is_active && <span style={S.badge("#ef4444","#fef2f2")}> 無効</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      <button onClick={() => setShowStoreForm(s)} style={{...S.btnOutline, padding:"6px 10px"}}><Edit3 size={12}/></button>
                      <button onClick={() => handleToggleStore(s.id, s.is_active)} style={{...S.btnOutline, padding:"6px 10px"}}>
                        {s.is_active ? <XCircle size={12} color="#ef4444"/> : <CheckCircle size={12} color="#059669"/>}
                      </button>
                      {isSuperAdmin && (
                        <button onClick={() => handleDeleteStore(s.id)} style={{...S.btnDanger, padding:"6px 10px"}}><Trash2 size={12}/></button>
                      )}
                    </div>
                  </div>
                  {s.memo && <div style={{ fontSize:11, color:"#94a3b8", marginTop:6, paddingLeft:30 }}>{s.memo}</div>}
                </div>
              ))
            )})()}
          </div>
        )}

        {/* ========== ユーザー管理 ========== */}
        {tab === "users" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#0f172a" }}>ユーザー ({usersData.length})</div>
              <button onClick={() => setShowUserAdd(true)} style={S.btn()}>
                <Plus size={14}/> ユーザー追加
              </button>
            </div>
            {usersData.length === 0 ? (
              <div style={S.empty}>ユーザーがいません</div>
            ) : (
              usersData.map(u => {
                const Icon = ROLE_ICONS[u.role] || UserCheck;
                const rc = ROLE_COLORS[u.role] || ROLE_COLORS.pharmacist;
                const storeNames = (u.user_stores || []).map(us => us.stores?.name).filter(Boolean);
                return (
                  <div key={u.id} style={S.card}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <Icon size={20} color={rc.color}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{u.display_name || u.email}</div>
                        <div style={{ fontSize:11, color:"#94a3b8" }}>
                          {u.email}
                          {u.employee_id && <span> / {u.employee_id}</span>}
                          {storeNames.length > 0 && <span> — {storeNames.join(", ")}</span>}
                        </div>
                      </div>
                      {u.is_approved===false && <span style={S.badge("#d97706","#fffbeb")}>未承認</span>}
                      <span style={S.badge(rc.color, rc.bg)}>{ROLE_LABELS[u.role]}</span>
                      <button onClick={() => setShowUserEdit(u)} style={{...S.btnOutline, padding:"6px 10px"}}><Edit3 size={12}/></button>
                      {isSuperAdmin && u.role !== "super_admin" && (
                        <button onClick={() => handleDeleteUser(u.id)} style={{...S.btnDanger, padding:"6px 10px"}}><Trash2 size={12}/></button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ========== API設定 ========== */}
        {tab === "apikeys" && (
          <div style={S.card}>
            <div style={S.cardTitle}><Key size={18} color="#6366f1"/> グローバルAPI設定</div>
            <ApiKeySection apiKeys={apiKeys} onRefresh={loadData}/>
          </div>
        )}

        {/* ========== 統計 ========== */}
        {tab === "stats" && (
          <div style={S.card}>
            <div style={S.cardTitle}><BarChart3 size={18} color="#6366f1"/> 使用統計</div>
            <UsageStats stores={stores} companies={companiesList}/>
          </div>
        )}

        {/* ========== ロール管理 ========== */}
        {tab === "roles" && (
          <div style={S.card}>
            <div style={S.cardTitle}><Settings size={18} color="#6366f1"/> ロール管理</div>
            <RolePanel onRefresh={loadData}/>
          </div>
        )}

        {/* ========== 申請一覧 ========== */}
        {tab === "pending" && <PendingUsersPanel onRefresh={loadData}/>}

        {/* ========== 会社管理 ========== */}
        {tab === "company" && (
          <div style={S.card}>
            <div style={S.cardTitle}><Building2 size={18} color="#6366f1"/> 会社管理</div>
            <CompanyPanel onRefresh={loadData} />
          </div>
        )}
      </main>

      {/* Modals */}
      {showStoreForm !== null && (
        <StoreFormModal
          store={showStoreForm || null}
          companies={companiesList}
          onClose={() => setShowStoreForm(null)}
          onSave={() => { setShowStoreForm(null); loadData(); }}
        />
      )}
      {showUserAdd && (
        <UserAddModal
          stores={stores}
          onClose={() => setShowUserAdd(false)}
          onSave={() => { setShowUserAdd(false); loadData(); }}
        />
      )}
      {showUserEdit && (
        <UserEditModal
          user={showUserEdit}
          stores={stores}
          onClose={() => setShowUserEdit(null)}
          onSave={() => { setShowUserEdit(null); loadData(); }}
        />
      )}
    </div>
  );
}
