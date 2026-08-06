// ==UserScript==
// @name         Deposit Helper Copy Tool
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Quick copy deposit data from MovePay admin panel
// @author       Deposit Helper
// @match        *://pub.prod.movepay.online/*
// @match        *://pub.prod.movepay.online/
// @match        *://pub.prod.movepay.online
// @match        *://*.movepay.online/*
// @match        *://*.*.movepay.online/*
// @match        *://*.*.*.movepay.online/*
// @include      *movepay.online*
// @updateURL    https://raw.githubusercontent.com/TsukuyomiTim/HubHelper/main/DepositHelper.user.js
// @downloadURL  https://raw.githubusercontent.com/TsukuyomiTim/HubHelper/main/DepositHelper.user.js
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
    "use strict";

    console.log("[Deposit Helper] script starting on", location.href);

    const CSS = '#depositHelperPanel {\n    position: fixed;\n    bottom: 20px;\n    right: 20px;\n    width: 320px;\n    min-width: 240px;\n    min-height: 260px;\n    max-width: 90vw;\n    max-height: 90vh;\n    background: #1e1e2f;\n    color: white;\n    border-radius: 10px;\n    padding: 12px;\n    padding-bottom: 22px;\n    font-family: Arial, sans-serif;\n    font-size: 14px;\n    z-index: 999999;\n    box-shadow: 0 0 15px rgba(0,0,0,0.5);\n    overflow: auto;\n    box-sizing: border-box;\n}\n\n#depositHelperPanel * {\n    box-sizing: border-box;\n}\n\n#depositHelperPanel input {\n    width: 100%;\n    margin-bottom: 6px;\n    padding: 0.4em 0.5em;\n    border-radius: 5px;\n    border: none;\n    font-size: 1em;\n    background: #2a2a3d;\n    color: white;\n}\n\n#depositHelperPanel input::placeholder {\n    color: #aaa;\n}\n\n#depositHelperPanel button {\n    width: 100%;\n    margin-top: 4px;\n    padding: 0.45em 0.6em;\n    border: none;\n    border-radius: 6px;\n    background: #4CAF50;\n    color: white;\n    cursor: pointer;\n    font-size: 1em;\n    font-weight: 500;\n}\n\n#depositHelperPanel button:hover {\n    background: #45a049;\n}\n\n#depositHelperPanel #dh_header {\n    cursor: move;\n    font-weight: bold;\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    margin-bottom: 8px;\n    user-select: none;\n    font-size: 1.1em;\n}\n\n#depositHelperPanel #dh_pin {\n    width: auto;\n    padding: 0.2em 0.6em;\n    margin-top: 0;\n    font-size: 0.95em;\n}\n\n/* Явный угол для ресайза */\n#dh_resize {\n    position: absolute;\n    right: 0;\n    bottom: 0;\n    width: 18px;\n    height: 18px;\n    cursor: nwse-resize;\n    z-index: 10;\n    background: linear-gradient(135deg, transparent 40%, #888 40%, #888 50%, transparent 50%, transparent 60%, #888 60%, #888 70%, transparent 70%);\n    border-radius: 0 0 10px 0;\n    opacity: 0.85;\n}\n\n#dh_resize:hover {\n    opacity: 1;\n    background: linear-gradient(135deg, transparent 40%, #4CAF50 40%, #4CAF50 50%, transparent 50%, transparent 60%, #4CAF50 60%, #4CAF50 70%, transparent 70%);\n}\n';

    function injectStyles() {
        if (document.getElementById("depositHelperStyles")) return;
        const s = document.createElement("style");
        s.id = "depositHelperStyles";
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }



function createPanel() {

    if (document.getElementById("depositHelperPanel")) return;

    const panel = document.createElement("div");
    panel.id = "depositHelperPanel";

    panel.innerHTML = `
        <div id="dh_header">
            <span>Deposit Helper</span>
            <button id="dh_pin">📌</button>
        </div>

        <input id="dh_method" placeholder="Payment Method">
        <button id="btn_method">Copy Method</button>

        <input id="dh_id" placeholder="ID">
        <button id="btn_id">Copy ID</button>

        <input id="dh_ref" placeholder="Transaction Reference">
        <button id="btn_ref">Copy Reference</button>

        <input id="dh_bank" placeholder="Bank">
        <input id="dh_holder" placeholder="Holder">
        <input id="dh_req" placeholder="Requisites">

        <button id="btn_req">Extract Requisites</button>

        <button id="btn_all">COPY ALL</button>
        <button id="btn_with_ref">WITH REFERENCE</button>
        <button id="btn_with_id">WITH ID</button>

        <div id="dh_resize" title="Потяни, чтобы изменить размер"></div>
    `;

    const mount = document.body || document.documentElement;
    mount.appendChild(panel);

    attachEvents();
    initDragAndResize(panel);
}


function applyScale(panel) {
    const baseW = 320;
    const baseH = 420;
    const w = panel.offsetWidth || baseW;
    const h = panel.offsetHeight || baseH;

    let scale = Math.max(0.75, Math.min(2.2, w / baseW));
    const scaleH = Math.max(0.75, Math.min(2.2, h / baseH));
    scale = Math.min(scale, scaleH * 1.15);

    panel.style.fontSize = (14 * scale) + "px";
}


function ensureVisible(panel) {
    // Переводим в left/top если ещё right/bottom
    const r = panel.getBoundingClientRect();

    // Если панель полностью или почти за экраном — возвращаем
    const margin = 20;
    const maxLeft = window.innerWidth - Math.min(panel.offsetWidth, 100); // хотя бы 100px видно
    const maxTop  = window.innerHeight - Math.min(panel.offsetHeight, 40);

    let left = r.left;
    let top  = r.top;

    // Если координаты явно мусорные (NaN / огромные)
    if (!isFinite(left) || !isFinite(top)) {
        left = window.innerWidth - panel.offsetWidth - 20;
        top  = window.innerHeight - panel.offsetHeight - 20;
    }

    // Клэмп
    if (left > maxLeft) left = Math.max(0, maxLeft);
    if (top  > maxTop)  top  = Math.max(0, maxTop);
    if (left < 0) left = margin;
    if (top  < 0) top  = margin;

    // Если панель всё ещё полностью за пределами (например left очень большой)
    if (r.right < 10 || r.bottom < 10 || r.left > window.innerWidth - 10 || r.top > window.innerHeight - 10) {
        left = Math.max(margin, window.innerWidth - panel.offsetWidth - margin);
        top  = Math.max(margin, window.innerHeight - panel.offsetHeight - margin);
    }

    panel.style.left = left + "px";
    panel.style.top  = top + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";

    // Сохраняем скорректированную позицию
    localStorage.setItem("dh_pos", JSON.stringify({ left, top }));
}


function initDragAndResize(panel) {
    const header = panel.querySelector("#dh_header");
    const pin = panel.querySelector("#dh_pin");
    const resizeHandle = panel.querySelector("#dh_resize");

    // --- Pin / lock ---
    let locked = localStorage.getItem("dh_locked") === "1";
    function applyPin() {
        pin.textContent = locked ? "📌" : "📍";
    }
    applyPin();

    // --- Restore size first (нужно для правильного расчёта позиции) ---
    let size = null;
    try { size = JSON.parse(localStorage.getItem("dh_size") || "null"); } catch (e) {}
    if (size && size.w >= 200 && size.h >= 200) {
        panel.style.width = size.w + "px";
        panel.style.height = size.h + "px";
    }

    // --- Restore position ---
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem("dh_pos") || "null"); } catch (e) {}
    if (pos && typeof pos.left === "number" && typeof pos.top === "number") {
        panel.style.left = pos.left + "px";
        panel.style.top = pos.top + "px";
        panel.style.right = "auto";
        panel.style.bottom = "auto";
    }

    applyScale(panel);

    // Сразу проверяем, не уехала ли панель за экран
    ensureVisible(panel);

    pin.onclick = (e) => {
        e.stopPropagation();
        locked = !locked;
        localStorage.setItem("dh_locked", locked ? "1" : "0");
        applyPin();
    };

    // --- Drag ---
    let sx, sy, sl, st, drag = false;

    header.onmousedown = (e) => {
        if (locked) return;
        if (e.target === pin || pin.contains(e.target)) return;

        drag = true;
        sx = e.clientX;
        sy = e.clientY;
        const r = panel.getBoundingClientRect();
        sl = r.left;
        st = r.top;
        document.onmousemove = mm;
        document.onmouseup = mu;
        e.preventDefault();
    };

    function mm(e) {
        if (!drag) return;
        let l = sl + e.clientX - sx;
        let t = st + e.clientY - sy;
        l = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, l));
        t = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, t));
        panel.style.left = l + "px";
        panel.style.top = t + "px";
        panel.style.right = "auto";
        panel.style.bottom = "auto";
    }

    function mu() {
        drag = false;
        document.onmousemove = null;
        document.onmouseup = null;
        localStorage.setItem("dh_pos", JSON.stringify({
            left: panel.offsetLeft,
            top: panel.offsetTop
        }));
    }

    // --- Custom Resize ---
    let resizing = false;
    let startX, startY, startW, startH;

    resizeHandle.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        resizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startW = panel.offsetWidth;
        startH = panel.offsetHeight;

        const r = panel.getBoundingClientRect();
        panel.style.left = r.left + "px";
        panel.style.top = r.top + "px";
        panel.style.right = "auto";
        panel.style.bottom = "auto";

        document.onmousemove = onResizeMove;
        document.onmouseup = onResizeUp;
    };

    function onResizeMove(e) {
        if (!resizing) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newW = Math.max(240, Math.min(window.innerWidth * 0.9, startW + dx));
        let newH = Math.max(260, Math.min(window.innerHeight * 0.9, startH + dy));

        panel.style.width = newW + "px";
        panel.style.height = newH + "px";

        applyScale(panel);
    }

    function onResizeUp() {
        if (!resizing) return;
        resizing = false;
        document.onmousemove = null;
        document.onmouseup = null;

        localStorage.setItem("dh_size", JSON.stringify({
            w: panel.offsetWidth,
            h: panel.offsetHeight
        }));
        localStorage.setItem("dh_pos", JSON.stringify({
            left: panel.offsetLeft,
            top: panel.offsetTop
        }));
    }

    // --- Автовозврат при смене экрана / ресайзе окна браузера ---
    let checkTimer = null;
    function scheduleCheck() {
        clearTimeout(checkTimer);
        checkTimer = setTimeout(() => {
            ensureVisible(panel);
            applyScale(panel);
        }, 80);
    }

    window.addEventListener("resize", scheduleCheck);
    window.addEventListener("focus", scheduleCheck);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") scheduleCheck();
    });

    // На всякий случай проверяем ещё раз чуть позже (после полной отрисовки)
    setTimeout(() => ensureVisible(panel), 300);
}


function copy(text) {
    if (!text) return;
    navigator.clipboard.writeText(text);
}

function findValue(labelText) {
    const labels = document.querySelectorAll("label");
    for (let label of labels) {
        if (label.textContent.trim() === labelText) {
            const id = label.getAttribute("for");
            if (!id) continue;
            const input = document.getElementById(id);
            if (input && input.value)
                return input.value.trim();
        }
    }
    return "";
}

function cleanMethod(full) {
    if (!full) return "";
    full = full
        .replace("_PAYCOS_ADAPTER", "")
        .replace("_PAYCOS", "")
        .replace("_ADAPTER", "");
    const parts = full.split("_");
    if (parts.length > 1) parts.shift();
    return parts.join("_");
}

function cleanMerchantTxId(v) {
    if (!v) return "";
    return v.replace(/^\d+_/, "");
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeText(s) {
    return (s || "").replace(/\s+/g, " ").trim();
}

function findElementsByText(patterns, opts) {
    opts = opts || {};
    const maxLen = opts.maxLen != null ? opts.maxLen : 100;
    const nodes = document.querySelectorAll(
        "button, a, span, div, li, label, [role='tab'], [role='button'], [role='treeitem']"
    );
    const found = [];
    for (const el of nodes) {
        // Берём только «свой» текст, без огромных вложенных кусков
        let t = "";
        if (el.childNodes.length) {
            for (const n of el.childNodes) {
                if (n.nodeType === 3) t += n.textContent;
            }
        }
        t = normalizeText(t || el.textContent);
        if (!t || t.length > maxLen) continue;

        for (const p of patterns) {
            const up = t.toUpperCase();
            const pp = String(p).toUpperCase();
            if (up === pp || up.includes(pp)) {
                found.push({ el, text: t, pattern: p });
                break;
            }
        }
    }
    return found;
}

function safeClick(el) {
    if (!el) return false;
    // Не кликаем по ссылкам — иначе уйдём со страницы
    if (el.tagName === "A" || el.closest && el.closest("a[href]")) {
        // Пробуем кликнуть ближайший не-ссылочный контейнер
        let p = el.parentElement;
        while (p && p !== document.body) {
            if (p.tagName !== "A" && !(p.closest && p.closest("a[href]"))) {
                el = p;
                break;
            }
            p = p.parentElement;
        }
    }
    try {
        el.dispatchEvent(new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window
        }));
        return true;
    } catch (e) {
        try { el.click(); return true; } catch (e2) { return false; }
    }
}

function clickFirstByText(patterns, opts) {
    const hits = findElementsByText(patterns, opts);
    // Предпочитаем более короткие совпадения (заголовки вкладок/логов)
    // и элементы, которые не являются ссылками
    hits.sort((a, b) => {
        const aLink = a.el.tagName === "A" || (a.el.closest && a.el.closest("a")) ? 1 : 0;
        const bLink = b.el.tagName === "A" || (b.el.closest && b.el.closest("a")) ? 1 : 0;
        if (aLink !== bLink) return aLink - bLink;
        return a.text.length - b.text.length;
    });
    for (const h of hits) {
        if (safeClick(h.el)) return h;
        if (h.el.parentElement && safeClick(h.el.parentElement)) return h;
    }
    return null;
}

function isExpanded(el) {
    if (!el) return false;
    const aria = el.getAttribute("aria-expanded");
    if (aria === "true") return true;
    if (aria === "false") return false;
    // Классы-маркеры раскрытия
    const cls = (el.className || "") + " " + ((el.parentElement && el.parentElement.className) || "");
    if (/expanded|open|active|opened/i.test(cls)) return true;
    return false;
}

function ensureExpanded(el) {
    if (!el) return;
    // Если уже раскрыт — не кликаем повторно (чтобы не закрыть)
    if (isExpanded(el)) return;
    // Проверяем родителя
    if (el.parentElement && isExpanded(el.parentElement)) return;

    safeClick(el);
}

function clickRawJsonInScope(scope) {
    const root = scope || document;
    const nodes = root.querySelectorAll
        ? root.querySelectorAll("button, span, div, li, label, [role='tab'], a")
        : [];
    const list = nodes.length ? [...nodes] : [...document.querySelectorAll("button, span, div, li, label, [role='tab'], a")];

    // Сначала не-ссылки
    const sorted = list.slice().sort((a, b) => {
        const aLink = a.tagName === "A" ? 1 : 0;
        const bLink = b.tagName === "A" ? 1 : 0;
        return aLink - bLink;
    });

    for (const el of sorted) {
        let t = "";
        for (const n of el.childNodes) {
            if (n.nodeType === 3) t += n.textContent;
        }
        t = normalizeText(t || el.textContent);
        if (/^raw\s*json$/i.test(t)) {
            if (safeClick(el)) return true;
        }
    }
    return false;
}

function collectJsonSnippets(scope) {
    const root = scope || document;
    const snippets = [];
    const add = (t) => {
        t = (t || "").trim();
        if (t.length < 20) return;
        if (!(t.includes("{") && t.includes('"'))) return;
        snippets.push(t);
    };

    root.querySelectorAll("pre, code, textarea").forEach(b => {
        add(b.textContent || b.value || "");
    });

    root.querySelectorAll("div").forEach(b => {
        if (b.children.length > 40) return;
        const t = (b.textContent || "").trim();
        if (t.length < 30 || t.length > 200000) return;
        if ((t.match(/"/g) || []).length < 6) return;
        if (t.includes("{") && t.includes('"')) add(t);
    });

    return snippets;
}

function extractValueFromText(text, keys) {
    if (!text) return "";
    for (let key of keys) {
        let regex = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`, "i");
        let match = text.match(regex);
        if (match && match[1]) return match[1];

        regex = new RegExp(`"${key}"\\s*:\\s*([^,}\\]\\s]+)`, "i");
        match = text.match(regex);
        if (match && match[1] && match[1] !== "null") {
            return match[1].replace(/^["']|["']$/g, "");
        }
    }
    return "";
}

function extractValueFromSnippets(snippets, keys) {
    for (const snip of snippets) {
        const v = extractValueFromText(snip, keys);
        if (v) return v;
    }
    return "";
}

function getAllText() {
    const blocks = document.querySelectorAll("pre, code, div");
    let text = "";
    blocks.forEach(b => { text += b.textContent + "\n"; });
    return text;
}

function extractValue(keys) {
    const snippets = collectJsonSnippets();
    let val = extractValueFromSnippets(snippets, keys);
    if (val) return val;
    return extractValueFromText(getAllText(), keys);
}

const LOG_TARGETS = [
    "CALLBACK",
    "OPERATOR_RESPONSE",
    "OPERATOR_RESPONCE",
    "OPERATOR_REQUEST",
    "MERCHANT_REQUEST",
    "MERCHANT_RESPONSE",
    "INITIALIZE_RESPONSE",
    "INIRIALIZE_RESPONSE", // опечатка
    "INITIALIZE_REQUEST",
    "CARD_PROCESSING_ORDER"
];

async function openTransactionLogsTab() {
    // Открываем вкладку Transaction Logs
    const hit = clickFirstByText([
        "Transaction Logs",
        "TRANSACTION LOGS",
        "Transaction logs",
        "Logs"
    ], { maxLen: 40 });
    await sleep(250);
    return !!hit;
}

async function probeLogsForRequisites() {
    // 1) Вкладка Transaction Logs
    await openTransactionLogsTab();
    await sleep(200);

    // 2) Находим все целевые логи и РАСКРЫВАЕМ их (не закрываем)
    const hits = findElementsByText(LOG_TARGETS, { maxLen: 60 });
    hits.sort((a, b) => a.text.length - b.text.length);

    const seen = new Set();
    const unique = [];
    for (const h of hits) {
        const key = h.text.toUpperCase().replace(/\s+/g, " ");
        // Отфильтровываем слишком общие совпадения
        let matched = false;
        for (const p of LOG_TARGETS) {
            if (key.includes(p)) { matched = true; break; }
        }
        if (!matched) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(h);
    }

    // Раскрываем ВСЕ логи подряд, не кликая повторно по уже открытым
    for (const hit of unique) {
        ensureExpanded(hit.el);
        await sleep(100);
        // Иногда нужно кликнуть родителя-строку
        if (hit.el.parentElement) {
            ensureExpanded(hit.el.parentElement);
        }
        await sleep(80);
    }

    await sleep(150);

    // 3) В каждом раскрытом блоке жмём Raw JSON (ищем рядом с заголовком лога)
    for (const hit of unique) {
        // Ищем контейнер секции лога
        let scope = hit.el.closest
            ? (hit.el.closest("[class*='log'], [class*='Log'], [class*='panel'], [class*=' Pan'], section, details, li, div") || hit.el.parentElement)
            : hit.el.parentElement;

        // Поднимаемся на 1–2 уровня, если scope слишком мелкий
        if (scope && scope.children && scope.children.length < 2 && scope.parentElement) {
            scope = scope.parentElement;
        }

        clickRawJsonInScope(scope);
        await sleep(120);
    }

    // Глобально ещё раз Raw JSON на случай одной общей вкладки
    clickRawJsonInScope(document);
    await sleep(200);

    // 4) Собираем JSON со ВСЕХ открытых блоков
    const allSnippets = collectJsonSnippets(document);
    const uniqSnips = [...new Set(allSnippets)];

    const bank = extractValueFromSnippets(uniqSnips, [
        "requisiteBank", "payment_system_readable", "bankName", "bank", "bank_name",
        "recipient_bank_name", "issuer", "paymentMethodName",
        "method_name", "provider"
    ]);
    let holder = extractValueFromSnippets(uniqSnips, [
        "recipient", "holder", "cardHolderName", "card_holder",
        "full_name", "name_on_card", "name", "fio", "recipient_name"
    ]);
    let req = extractValueFromSnippets(uniqSnips, [
        "cardNumber", "card_number", "recipient_card_number", "pan",
        "address", "requisites", "requisite", "number", "telefon", "phone", "phone_number",
        "value", "holder_account", "payment_requisite",
        "sbpNumber", "refer", "sbp_phone_number"
    ]);
    const identifier = extractValueFromSnippets(uniqSnips, [
        "identifier", "Identifier", "IDENTIFIER",
        "identificator", "id_identifier"
    ]);

    return { bank, holder, req, identifier, snippets: uniqSnips, opened: unique.map(u => u.text) };
}

function isNumberLike(str) {
    if (!str) return false;
    return /[0-9+]/.test(str);
}

function extractRequisites() {
    const bank = extractValue([
        "requisiteBank", "payment_system_readable", "bankName", "bank", "bank_name",
        "recipient_bank_name", "issuer", "paymentMethodName",
        "method_name", "provider"
    ]);

    let holder = extractValue([
        "recipient", "holder", "cardHolderName", "card_holder",
        "full_name", "name_on_card", "name", "fio", "recipient_name"
    ]);

    let req = extractValue([
        "cardNumber", "card_number", "recipient_card_number", "pan",
        "address", "requisites", "requisite", "number", "telefon", "phone", "phone_number",
        "value", "holder_account", "payment_requisite",
        "sbpNumber", "refer", "sbp_phone_number"
    ]);

    if (req && !isNumberLike(req)) {
        if (!holder) holder = req;
        req = extractValue([
            "cardNumber", "card_number", "recipient_card_number", "pan",
            "number", "telefon", "phone", "phone_number", "value",
            "holder_account", "payment_requisite",
            "sbpNumber", "refer", "sbp_phone_number"
        ]);
    }

    return { bank, holder, req };
}

function autoExtract() {
    const methodRaw = findValue("Payment Method");
    const id = findValue("ID");
    const ref = findValue("Transaction Reference");
    const merchantRaw = findValue("Merchant Transaction ID");
    const merchant = cleanMerchantTxId(merchantRaw);

    const clean = cleanMethod(methodRaw);
    const data = extractRequisites();

    document.getElementById("dh_method").value = clean;
    document.getElementById("dh_id").value = id;
    document.getElementById("dh_ref").value = ref;
    document.getElementById("dh_bank").value = data.bank;
    document.getElementById("dh_holder").value = data.holder;
    document.getElementById("dh_req").value = data.req;

    return {
        method: clean,
        id,
        ref,
        merchant,
        bank: data.bank,
        holder: data.holder,
        req: data.req
    };
}

function attachEvents() {

    document.getElementById("btn_method").onclick = function () {
        const full = findValue("Payment Method");
        const clean = cleanMethod(full);
        document.getElementById("dh_method").value = clean;
        copy(clean);
    };

    document.getElementById("btn_id").onclick = function () {
        const id = findValue("ID");
        document.getElementById("dh_id").value = id;
        copy(id);
    };

    document.getElementById("btn_ref").onclick = function () {
        const ref = findValue("Transaction Reference");
        document.getElementById("dh_ref").value = ref;
        copy(ref);
    };

    document.getElementById("btn_req").onclick = function () {
        const data = extractRequisites();
        document.getElementById("dh_bank").value = data.bank;
        document.getElementById("dh_holder").value = data.holder;
        document.getElementById("dh_req").value = data.req;
    };

    document.getElementById("btn_all").onclick = function () {
        // Заполняем поля (если пустые / обновить)
        const d = autoExtract();

        // Если до этого жали WITH REFERENCE — identifier мог быть в requisites.
        // Не затираем его, если autoExtract ничего полезного в req не нашёл,
        // либо если в поле уже лежит identifier.
        const identifier = extractValue([
            "identifier", "Identifier", "IDENTIFIER",
            "identificator", "id_identifier"
        ]);
        const reqInput = document.getElementById("dh_req");
        if (identifier) {
            // Предпочитаем identifier для копирования (как при WITH REFERENCE)
            reqInput.value = identifier;
            d.req = identifier;
        }

        // Берём актуальные значения прямо из полей панели
        const method = document.getElementById("dh_method").value.trim() || d.method;
        const id = document.getElementById("dh_id").value.trim() || d.id;
        const ref = document.getElementById("dh_ref").value.trim() || d.ref;
        const bank = document.getElementById("dh_bank").value.trim() || d.bank;
        const holder = document.getElementById("dh_holder").value.trim() || d.holder;
        const req = reqInput.value.trim() || d.req;

        const text =
`Method: ${method}
ID: ${id}
Reference: ${ref}
Merchant Transaction ID: ${d.merchant}

Bank: ${bank}
Holder: ${holder}
Requisites: ${req}`;

        copy(text);
    };

    document.getElementById("btn_with_ref").onclick = async function () {
        const btn = document.getElementById("btn_with_ref");
        const prevLabel = btn.textContent;
        btn.disabled = true;

        // Сначала обычное заполнение (method/id/ref)
        autoExtract();

        // Повторы, если логи ещё не прогрузились
        const maxAttempts = 5;
        const delayMs = 800;
        let data = null;

        try {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                btn.textContent = "WAIT " + attempt + "/" + maxAttempts + "...";
                console.log("[Deposit Helper] WITH REFERENCE attempt", attempt);

                try {
                    data = await probeLogsForRequisites();
                } catch (e) {
                    console.warn("Deposit Helper probeLogs error", e);
                    data = null;
                }

                const hasLogs = data && data.opened && data.opened.length > 0;
                const hasData = data && (data.identifier || data.req || data.bank || data.holder);

                if (hasData) {
                    if (data.bank) document.getElementById("dh_bank").value = data.bank;
                    if (data.holder) document.getElementById("dh_holder").value = data.holder;
                    if (data.identifier) {
                        document.getElementById("dh_req").value = data.identifier;
                    } else if (data.req) {
                        document.getElementById("dh_req").value = data.req;
                    }
                    console.log("[Deposit Helper] requisites found on attempt", attempt, data.opened);
                    break;
                }

                // Если логи не найдены или данных нет — ждём и пробуем снова
                if (attempt < maxAttempts) {
                    console.log("[Deposit Helper] logs not ready, retrying...", { hasLogs, hasData });
                    await sleep(delayMs);
                }
            }

            // Финальный fallback по всей странице
            if (!document.getElementById("dh_req").value) {
                const identifier = extractValue([
                    "identifier", "Identifier", "IDENTIFIER",
                    "identificator", "id_identifier"
                ]);
                if (identifier) {
                    document.getElementById("dh_req").value = identifier;
                }
            }
        } finally {
            btn.textContent = prevLabel;
            btn.disabled = false;
        }
    };

    document.getElementById("btn_with_id").onclick = function () {
        autoExtract();
    };
}



    function startHelper() {
        try {
            injectStyles();
            if (document.getElementById("depositHelperPanel")) {
                console.log("[Deposit Helper] panel already exists");
                return;
            }
            if (!document.body) {
                console.log("[Deposit Helper] waiting for body...");
                setTimeout(startHelper, 200);
                return;
            }
            createPanel();
            console.log("[Deposit Helper] panel created OK");
        } catch (e) {
            console.error("[Deposit Helper] error:", e);
            setTimeout(startHelper, 1000);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startHelper);
    } else {
        startHelper();
    }
    setTimeout(startHelper, 500);
    setTimeout(startHelper, 2000);
    setTimeout(startHelper, 5000);
})();
