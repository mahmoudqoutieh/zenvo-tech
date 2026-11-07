(function () {
  const C = window.ZENVO;
  const H = { apikey: C.SUPABASE_KEY, Authorization: "Bearer " + C.SUPABASE_KEY, "Content-Type": "application/json" };
  const $ = (id) => document.getElementById(id);
  let products = [];
  let cfg = { mode: "test", currency: "USD" };
  let current = null; // { orderId, sessionId, amount, currency, mode }

  const fmt = (n) => "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

  function msg(text, kind) {
    const el = $("co-msg");
    el.textContent = text || "";
    el.style.display = text ? "block" : "none";
    el.style.color = kind === "ok" ? "#5EE6CF" : "#FF9B8A";
  }

  // Every country, with Arabic names from the browser
  function fillCountries() {
    const sel = $("co-country");
    let list = [];
    try {
      const dn = new Intl.DisplayNames(["ar"], { type: "region" });
      const codes = "AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI KH CM CA CV CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IQ IE IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW".split(" ");
      list = codes.map((c) => dn.of(c) || c).sort((a, b) => a.localeCompare(b, "ar"));
    } catch (e) { list = ["الأردن"]; }
    sel.innerHTML = '<option value="">اختر الدولة</option>' + list.map((n) => `<option>${n}</option>`).join("");
  }

  function updateSummary() {
    const p = products.find((x) => x.id === $("co-product").value);
    if (!p) return;
    $("co-sum-name").textContent = p.name;
    $("co-sum-price").textContent = fmt(p.price);
    $("co-sum-old").textContent = p.old_price ? fmt(p.old_price) : "";
  }

  async function load() {
    fillCountries();
    try {
      const [pr, cf] = await Promise.all([
        fetch(C.SUPABASE_URL + "/rest/v1/products?select=*&order=sort", { headers: H }).then((r) => r.json()),
        fetch(C.SUPABASE_URL + "/rest/v1/rpc/public_config", { method: "POST", headers: H, body: "{}" }).then((r) => r.json()),
      ]);
      if (Array.isArray(pr) && pr.length) products = pr;
      if (cf && cf.mode) cfg = cf;
    } catch (e) { /* keep page defaults */ }
    const sel = $("co-product");
    const wanted = new URLSearchParams(location.search).get("product") || sel.value;
    if (products.length) sel.innerHTML = products.map((p) => `<option value="${p.id}">${p.name} — ${fmt(p.price)}</option>`).join("");
    if ([...sel.options].some((o) => o.value === wanted)) sel.value = wanted;
    updateSummary();
    products.forEach((p) => {
      document.querySelectorAll(`[data-price="${p.id}"]`).forEach((el) => (el.textContent = fmt(p.price)));
      document.querySelectorAll(`[data-old="${p.id}"]`).forEach((el) => (el.textContent = p.old_price ? fmt(p.old_price) : ""));
    });
    // hide cards of products switched off in the dashboard
    document.querySelectorAll("[data-card]").forEach((el) => {
      if (products.length && !products.some((p) => p.id === el.dataset.card)) el.style.display = "none";
    });
    if (cfg.mode === "test") $("co-testbadge").style.display = "block";
    if (cfg.whatsapp) document.querySelectorAll("[data-wa]").forEach((a) => {
      a.href = "https://wa.me/" + String(cfg.whatsapp).replace(/[^0-9]/g, "");
      const t = a.querySelector("[data-wa-text]"); if (t) t.textContent = "واتساب: " + cfg.whatsapp;
    });
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (window.myfatoorah) return res();
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("تعذر تحميل نموذج الدفع، حدّث الصفحة وحاول مرة أخرى"));
      document.head.appendChild(s);
    });
  }

  async function api(body) {
    const r = await fetch(C.SUPABASE_URL + "/functions/v1/checkout", { method: "POST", headers: H, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || "حدث خطأ، حاول مرة أخرى");
    return j;
  }

  async function startPayment(ev) {
    ev.preventDefault();
    msg("");
    if (!$("co-form").reportValidity()) return;
    const btn = $("co-next");
    btn.disabled = true; btn.textContent = "جاري تجهيز الدفع…";
    try {
      current = await api({
        action: "init",
        product_id: $("co-product").value,
        return_path: location.pathname,
        customer: {
          name: $("co-name").value, email: $("co-email").value, phone: $("co-phone").value,
          country: $("co-country").value, city: $("co-city").value, address: $("co-address").value,
        },
      });
      await loadScript(current.mode === "live" ? C.MF_SCRIPT.live : C.MF_SCRIPT.test);
      $("co-step1").style.display = "none";
      $("co-step2").style.display = "flex";
      $("co-paytotal").textContent = fmt(current.amount);
      $("embedded-payment").innerHTML = "";
      window.myfatoorah.init({
        sessionId: current.sessionId,
        callback: onPaymentDone,
        containerId: "embedded-payment",
        shouldHandlePaymentUrl: true, // bank verification (OTP) opens inside this page
      });
    } catch (e) {
      msg(e.message);
    } finally {
      btn.disabled = false; btn.textContent = "متابعة للدفع";
    }
  }

  function paymentIdFrom(resp) {
    if (resp.paymentId) return resp.paymentId;
    try { return new URL(resp.redirectionUrl).searchParams.get("paymentId"); } catch (_) { return ""; }
  }

  async function onPaymentDone(resp) {
    if (!resp || !resp.isSuccess) { msg("ما تمت العملية. تأكد من بيانات البطاقة وحاول مرة أخرى."); return; }
    const pid = paymentIdFrom(resp);
    if (!pid) { if (resp.redirectionUrl) window.location.href = resp.redirectionUrl; return; }
    msg("جاري تأكيد الدفع…", "ok");
    try {
      const r = await api({ action: "verify", order_id: current.orderId, payment_id: pid });
      window.location.href = `thanks.html?status=${r.status}&order=${encodeURIComponent(current.orderId)}`;
    } catch (e) {
      window.location.href = `thanks.html?status=pending&order=${encodeURIComponent(current.orderId)}`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    load();
    $("co-product").addEventListener("change", updateSummary);
    $("co-form").addEventListener("submit", startPayment);
    $("co-back").addEventListener("click", () => { $("co-step2").style.display = "none"; $("co-step1").style.display = "flex"; msg(""); });
    document.querySelectorAll("[data-product]").forEach((a) =>
      a.addEventListener("click", () => {
        const s = $("co-product");
        if ([...s.options].some((o) => o.value === a.dataset.product)) { s.value = a.dataset.product; updateSummary(); }
      })
    );
  });
})();
