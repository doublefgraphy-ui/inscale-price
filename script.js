(() => {
  "use strict";

  const CSV_URL = "price.csv";
  const STOCK_CSV_URL = "cassina-stock.csv";
  const INBOUND_CSV_URL = "vitra-stock.csv";
  const ARTEK_CSV_URL = "artek-stock.csv";

  const productList = document.getElementById("productList");
  const searchInput = document.getElementById("searchInput");
  const countText = document.getElementById("countText");
  const emptyState = document.getElementById("emptyState");
  const resetBtn = document.getElementById("resetBtn");
  const homeBtn = document.getElementById("homeBtn");
  const floorButtons = Array.from(document.querySelectorAll(".floor-btn"));
  const stockFilters = document.getElementById("stockFilters");
  const stockCategoryButtons = Array.from(document.querySelectorAll(".stock-filter-btn"));
  const inboundFilters = document.getElementById("inboundFilters");
  const inboundFilterButtons = Array.from(document.querySelectorAll(".inbound-filter-btn"));
  const artekFilters = document.getElementById("artekFilters");
  const artekFilterButtons = Array.from(document.querySelectorAll(".artek-filter-btn"));
  const hintText = document.getElementById("hintText");

  const galleryModal = document.getElementById("galleryModal");
  const galleryImage = document.getElementById("galleryImage");
  const galleryTitle = document.getElementById("galleryTitle");
  const galleryBrand = document.getElementById("galleryBrand");
  const galleryCaption = document.getElementById("galleryCaption");
  const galleryCounter = document.getElementById("galleryCounter");
  const galleryDots = document.getElementById("galleryDots");
  const galleryPrev = document.getElementById("galleryPrev");
  const galleryNext = document.getElementById("galleryNext");

  let allProducts = [];
  let stockProducts = [];
  let stockLoadError = null;
  let inboundProducts = [];
  let inboundLoadError = null;
  let artekProducts = [];
  let artekLoadError = null;
  let activeMode = "all";
  let activeFloor = "";
  let activeStockCategory = "all";
  let activeInboundFilter = "all";
  let activeArtekFilter = "all";

  let galleryImages = [];
  let galleryIndex = 0;
  let touchStartX = 0;

  function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        currentField += '"';
        i += 1;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === "," && !inQuotes) {
        currentRow.push(currentField);
        currentField = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (currentField !== "" || currentRow.length > 0) {
          currentRow.push(currentField);
          rows.push(currentRow);
        }

        currentRow = [];
        currentField = "";

        if (char === "\r" && nextChar === "\n") {
          i += 1;
        }

        continue;
      }

      currentField += char;
    }

    if (currentField !== "" || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    if (rows.length === 0) {
      return [];
    }

    const headers = rows.shift().map((header) =>
      header.trim().replace(/^\uFEFF/, "")
    );

    return rows
      .filter((row) => row.some((cell) => String(cell || "").trim() !== ""))
      .map((row) => {
        const item = {};

        headers.forEach((header, index) => {
          item[header] = row[index] ? String(row[index]).trim() : "";
        });

        return item;
      });
  }

  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function displayValue(value) {
    if (value === undefined || value === null || value === "") {
      return "-";
    }

    return value;
  }

  function normalizeNumber(value) {
    return String(value || "").replace(/[^0-9]/g, "");
  }

  function formatMoney(value) {
    const raw = String(value || "").trim();

    if (!raw) {
      return "";
    }

    const hasText = /[가-힣A-Za-z]/.test(raw);
    const hasLineBreak = raw.includes("\n");
    const hasWon = raw.includes("₩") || raw.includes("\\");
    const digitOnly = normalizeNumber(raw);

    if (!hasText && !hasLineBreak && !hasWon && digitOnly) {
      return `₩${Number(digitOnly).toLocaleString("ko-KR")}`;
    }

    return escapeHTML(raw.replace(/\\/g, "₩"));
  }

  function formatPrice(value) {
    return formatMoney(value) || "가격 문의";
  }

  function hasDPPrice(item) {
    return normalizeNumber(item.dp_price).length > 0 || String(item.dp_price || "").trim() !== "";
  }

  function isFavorite(item) {
    const value = String(item.favorite || "").trim().toUpperCase();
    return value === "Y" || value === "YES" || value === "TRUE" || value === "1" || value === "추천";
  }

  function isDPSale(item) {
    if (hasDPPrice(item)) {
      return true;
    }

    const status = String(item.sale_status || "").toUpperCase();
    if (status.includes("DP")) {
      return true;
    }

    const text = [
      item.display,
      item.price,
      item.description,
      item.note
    ].join(" ").toUpperCase();

    return (
      text.includes("DP SALE") ||
      text.includes("DPSALE") ||
      text.includes("DISPLAY SALE") ||
      text.includes("DP35") ||
      text.includes("DP30") ||
      text.includes("스크래치") ||
      text.includes("스크레치") ||
      text.includes("손상") ||
      text.includes("현재 가격") ||
      text.includes("현재가격") ||
      text.includes("디피")
    );
  }

  function makeSearchText(item) {
    return [
      item.floor,
      item.location,
      item.brand,
      item.name,
      item.category,
      item.price,
      item.dp_price,
      item.discount_rate,
      item.sale_status,
      item.display,
      item.description,
      item.designer,
      item.size,
      item.material,
      item.color,
      item.origin,
      item.note,
      item.product_code
    ].join(" ").toLowerCase();
  }

  function makeStockSearchText(item) {
    return [
      "cassina",
      item.category,
      item.model,
      item.product_code,
      item.spec,
      item.available_qty,
      item.coming_soon_qty,
      item.coming_soon_note,
      item.stock_date
    ].join(" ").toLowerCase();
  }

  function makeInboundSearchText(item) {
    return [
      item.brand,
      item.category,
      item.product_name,
      item.size,
      item.spec,
      item.total_qty,
      item.available_qty,
      item.dp_qty,
      item.coming_qty,
      item.remark,
      item.price,
      item.stock_date
    ].join(" ").toLowerCase();
  }

  function inboundFilterKey(item, filter) {
    if (filter === "all") return true;

    const categoryKey = String(item.category || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    return categoryKey === filter;
  }

  function stockCategoryKey(category) {
    const value = String(category || "").toUpperCase();

    if (value.includes("CHAISE")) {
      return "chaise";
    }

    if (value.includes("SOFAS")) {
      return "sofas";
    }

    if (value.includes("ARMCHAIRS") || value.includes("CHAIRS")) {
      return "chairs";
    }

    if (value.includes("TABLES")) {
      return "tables";
    }

    if (value.includes("CABINETS")) {
      return "cabinets";
    }

    return "etc";
  }

  function numberValue(value) {
    const number = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function stockCategoryLabel(category) {
    return String(category || "")
      .replace(" - INDOOR", "")
      .replace("ARMCHAIRS & CHAIRS", "CHAIRS")
      .replace("TABLES & LOW TABLES", "TABLES");
  }

  function splitImages(value) {
    return String(value || "")
      .split("|")
      .map((url) => url.trim())
      .filter(Boolean);
  }

  function getGalleryImages(item) {
    const images = [];
    if (item.image) {
      images.push(item.image);
    }

    splitImages(item.more_image).forEach((url) => images.push(url));
    splitImages(item.showroom_images).forEach((url) => images.push(url));

    return [...new Set(images)];
  }

  function specRow(label, value) {
    return `
      <div class="spec-row">
        <span>${label}</span>
        <strong>${escapeHTML(displayValue(value))}</strong>
      </div>
    `;
  }

  function saleBox(item) {
    if (!hasDPPrice(item)) {
      return "";
    }

    const rate = String(item.discount_rate || "").trim();
    const status = String(item.sale_status || "DP SALE").trim();
    const rateHTML = rate ? `<div class="discount-rate">${escapeHTML(rate)}% OFF</div>` : "";

    return `
      <div class="sale-box">
        <span class="sale-label">${escapeHTML(status || "DP SALE")}</span>
        <div class="sale-price">${formatMoney(item.dp_price)}</div>
        ${rateHTML}
      </div>
    `;
  }

  function badges(item) {
    return [
      item.dpSale ? `<span class="badge sale">DP SALE</span>` : "",
      isFavorite(item) ? `<span class="badge favorite">추천</span>` : "",
      item.match_status === "new_or_unmatched" ? `<span class="badge warning">이미지 확인 필요</span>` : ""
    ].join("");
  }

  function actionButtons(item, index) {
    const hasMoreImages = getGalleryImages(item).length > 1;
    const buttons = [];

    if (hasMoreImages) {
      buttons.push(`
        <button class="action-btn more-image-btn" type="button" data-gallery-index="${index}">
          MORE IMAGE
        </button>
      `);
    }

    if (item.url) {
      buttons.push(`
        <a class="action-btn info-link" href="${escapeHTML(item.url)}" target="_blank" rel="noopener">
          INFO LINK
        </a>
      `);
    }

    if (!buttons.length) {
      return "";
    }

    return `<div class="card-actions ${buttons.length === 1 ? "single" : ""}">${buttons.join("")}</div>`;
  }

  function productCard(item, index) {
    const imageHTML = item.image
      ? `
        <div class="thumb">
          <img
            src="${escapeHTML(item.image)}"
            alt="${escapeHTML(item.name)}"
            loading="lazy"
            onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'>NO IMAGE</div>'"
          >
        </div>
      `
      : `
        <div class="thumb">
          <div class="no-image">NO IMAGE</div>
        </div>
      `;

    return `
      <article class="card">
        ${imageHTML}

        <div class="card-body">
          <div class="meta">
            <span class="badge dark">${escapeHTML(displayValue(item.floor))}</span>
            <span class="badge">${escapeHTML(displayValue(item.location))}</span>
            <span class="badge">${escapeHTML(displayValue(item.category))}</span>
            ${badges(item)}
          </div>

          <h2 class="name">${escapeHTML(displayValue(item.name))}</h2>
          <p class="brand">${escapeHTML(displayValue(item.brand))}</p>

          <div class="price">${formatPrice(item.price)}</div>
          ${saleBox(item)}

          <div class="spec">
            ${specRow("Designer", item.designer)}
            ${specRow("Size", item.size)}
            ${specRow("Material", item.material)}
            ${specRow("Color", item.color)}
            ${specRow("Origin", item.origin)}
          </div>

          ${actionButtons(item, index)}
        </div>
      </article>
    `;
  }

  function stockVariantRow(item) {
    const available = numberValue(item.available_qty);
    const coming = numberValue(item.coming_soon_qty);
    const availableHTML = available > 0
      ? `<span class="stock-pill available">AVAILABLE ${available.toLocaleString("ko-KR")}</span>`
      : "";
    const comingHTML = coming > 0
      ? `<span class="stock-pill coming">COMING ${coming.toLocaleString("ko-KR")}</span>`
      : "";
    const noteHTML = item.coming_soon_note
      ? `<span class="stock-note">${escapeHTML(item.coming_soon_note)}</span>`
      : "";

    return `
      <div class="stock-variant">
        <div class="stock-code">${escapeHTML(displayValue(item.product_code))}</div>
        <div class="stock-spec">${escapeHTML(displayValue(item.spec))}</div>
        <div class="stock-qty">
          ${availableHTML}
          ${comingHTML}
          ${noteHTML}
        </div>
      </div>
    `;
  }

  function stockCard(group) {
    const availableTotal = group.items.reduce((sum, item) => sum + numberValue(item.available_qty), 0);
    const comingTotal = group.items.reduce((sum, item) => sum + numberValue(item.coming_soon_qty), 0);
    const stockDate = group.items.find((item) => item.stock_date)?.stock_date || "";

    return `
      <article class="stock-card">
        <div class="card-body">
          <div class="meta">
            <span class="badge dark">CASSINA</span>
            <span class="badge">${escapeHTML(stockCategoryLabel(group.category))}</span>
          </div>

          <div class="stock-card-head">
            <div>
              <h2 class="name">${escapeHTML(group.model)}</h2>
              <p class="stock-brand">CASSINA STOCK</p>
            </div>
            <div class="stock-date">${stockDate ? `${escapeHTML(stockDate)} 기준` : ""}</div>
          </div>

          <div class="stock-summary-strip">
            ${availableTotal > 0 ? `<span class="stock-summary-chip">Available ${availableTotal.toLocaleString("ko-KR")} pcs</span>` : ""}
            ${comingTotal > 0 ? `<span class="stock-summary-chip">Coming soon ${comingTotal.toLocaleString("ko-KR")} pcs</span>` : ""}
            <span class="stock-summary-chip">${group.items.length.toLocaleString("ko-KR")} specs</span>
          </div>

          <div class="stock-variants">
            ${group.items.map(stockVariantRow).join("")}
          </div>
        </div>
      </article>
    `;
  }

  function groupStockItems(items) {
    const groups = new Map();

    items.forEach((item) => {
      const key = `${item.category}__${item.model}`;

      if (!groups.has(key)) {
        groups.set(key, {
          category: item.category || "",
          model: item.model || "-",
          items: []
        });
      }

      groups.get(key).items.push(item);
    });

    return Array.from(groups.values());
  }

  function inboundVariantRow(item) {
    const available = numberValue(item.available_qty);
    const dp = numberValue(item.dp_qty);
    const coming = numberValue(item.coming_qty);
    const specText = String(item.spec || item.size || "Standard").trim();
    const sizeText = item.spec && item.size ? String(item.size).replace(/^Size\s*:\s*/i, "") : "";
    const detailParts = [];

    if (sizeText) detailParts.push(sizeText);
    if (item.price) detailParts.push(item.price);
    if (item.remark) detailParts.push(item.remark);

    return `
      <div class="stock-variant vitra-variant">
        <div class="stock-spec vitra-spec">
          <strong>${escapeHTML(specText)}</strong>
          ${detailParts.length ? `<span class="vitra-detail">${escapeHTML(detailParts.join(" · "))}</span>` : ""}
        </div>
        <div class="stock-qty">
          ${available > 0 ? `<span class="stock-pill available">AVAILABLE ${available.toLocaleString("ko-KR")}</span>` : ""}
          ${dp > 0 ? `<span class="stock-pill dp">DP ${dp.toLocaleString("ko-KR")}</span>` : ""}
          ${coming > 0 ? `<span class="stock-pill incoming">COMING ${coming.toLocaleString("ko-KR")}</span>` : ""}
        </div>
      </div>
    `;
  }

  function groupInboundItems(items) {
    const groups = new Map();

    items.forEach((item) => {
      const key = `${item.category}__${item.product_name}`;

      if (!groups.has(key)) {
        groups.set(key, {
          category: item.category || "-",
          productName: item.product_name || "-",
          items: []
        });
      }

      groups.get(key).items.push(item);
    });

    return Array.from(groups.values());
  }

  function inboundCard(group) {
    const total = group.items.reduce((sum, item) => sum + numberValue(item.total_qty), 0);
    const available = group.items.reduce((sum, item) => sum + numberValue(item.available_qty), 0);
    const dp = group.items.reduce((sum, item) => sum + numberValue(item.dp_qty), 0);
    const coming = group.items.reduce((sum, item) => sum + numberValue(item.coming_qty), 0);
    const stockDate = group.items.find((item) => item.stock_date)?.stock_date || "";
    const imageUrl = group.items.find((item) => item.image_url)?.image_url || "";

    const imageHTML = imageUrl
      ? `
          <a class="stock-image-wrap" href="${escapeHTML(imageUrl)}" target="_blank" rel="noopener" aria-label="${escapeHTML(group.productName)} 이미지 크게 보기">
            <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(group.productName)}" loading="lazy">
          </a>
        `
      : "";

    return `
      <article class="stock-card inbound-card">
        <div class="card-body">
          <div class="meta">
            <span class="badge dark">VITRA</span>
            <span class="badge">${escapeHTML(group.category)}</span>
          </div>

          ${imageHTML}

          <div class="stock-card-head">
            <div>
              <h2 class="name">${escapeHTML(group.productName)}</h2>
              <p class="stock-brand">VITRA STOCK</p>
            </div>
            <div class="stock-date">${stockDate ? `${escapeHTML(stockDate)} 기준` : ""}</div>
          </div>

          <div class="stock-summary-strip">
            <span class="stock-summary-chip">Total ${total.toLocaleString("ko-KR")} pcs</span>
            ${available > 0 ? `<span class="stock-summary-chip">Available ${available.toLocaleString("ko-KR")} pcs</span>` : ""}
            ${dp > 0 ? `<span class="stock-summary-chip">DP ${dp.toLocaleString("ko-KR")} pcs</span>` : ""}
            ${coming > 0 ? `<span class="stock-summary-chip">Coming ${coming.toLocaleString("ko-KR")} pcs</span>` : ""}
            <span class="stock-summary-chip">${group.items.length.toLocaleString("ko-KR")} specs</span>
          </div>

          <div class="stock-variants">
            ${group.items.map(inboundVariantRow).join("")}
          </div>
        </div>
      </article>
    `;
  }


  function artekCard(group) {
    const total = group.items.reduce((sum, item) => sum + numberValue(item.total_qty), 0);
    const available = group.items.reduce((sum, item) => sum + numberValue(item.available_qty), 0);
    const dp = group.items.reduce((sum, item) => sum + numberValue(item.dp_qty), 0);
    const coming = group.items.reduce((sum, item) => sum + numberValue(item.coming_qty), 0);
    const stockDate = group.items.find((item) => item.stock_date)?.stock_date || "";
    const imageUrl = group.items.find((item) => item.image_url)?.image_url || "";

    const imageHTML = imageUrl
      ? `
          <a class="stock-image-wrap" href="${escapeHTML(imageUrl)}" target="_blank" rel="noopener" aria-label="${escapeHTML(group.productName)} 이미지 크게 보기">
            <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(group.productName)}" loading="lazy">
          </a>
        `
      : "";

    return `
      <article class="stock-card artek-card">
        <div class="card-body">
          <div class="meta">
            <span class="badge dark">ARTEK</span>
            <span class="badge">${escapeHTML(group.category)}</span>
          </div>

          ${imageHTML}

          <div class="stock-card-head">
            <div>
              <h2 class="name">${escapeHTML(group.productName)}</h2>
              <p class="stock-brand">ARTEK STOCK</p>
            </div>
            <div class="stock-date">${stockDate ? `${escapeHTML(stockDate)} 기준` : ""}</div>
          </div>

          <div class="stock-summary-strip">
            <span class="stock-summary-chip">Total ${total.toLocaleString("ko-KR")} pcs</span>
            ${available > 0 ? `<span class="stock-summary-chip">Available ${available.toLocaleString("ko-KR")} pcs</span>` : ""}
            ${dp > 0 ? `<span class="stock-summary-chip">DP ${dp.toLocaleString("ko-KR")} pcs</span>` : ""}
            ${coming > 0 ? `<span class="stock-summary-chip">Coming ${coming.toLocaleString("ko-KR")} pcs</span>` : ""}
            <span class="stock-summary-chip">${group.items.length.toLocaleString("ko-KR")} specs</span>
          </div>

          <div class="stock-variants">
            ${group.items.map(inboundVariantRow).join("")}
          </div>
        </div>
      </article>
    `;
  }

  function updateGallery() {
    const url = galleryImages[galleryIndex];

    galleryImage.src = url;
    galleryCounter.textContent = `${galleryIndex + 1} / ${galleryImages.length}`;

    galleryDots.innerHTML = galleryImages
      .map((_, index) => `
        <button
          type="button"
          class="gallery-dot ${index === galleryIndex ? "is-active" : ""}"
          data-dot-index="${index}"
          aria-label="${index + 1}번 이미지"
        ></button>
      `)
      .join("");

    galleryPrev.hidden = galleryImages.length <= 1;
    galleryNext.hidden = galleryImages.length <= 1;
  }

  function openGallery(index) {
    const item = allProducts[index];
    if (!item) {
      return;
    }

    galleryImages = getGalleryImages(item);
    if (!galleryImages.length) {
      return;
    }

    galleryIndex = 0;
    galleryTitle.textContent = item.name || "";
    galleryBrand.textContent = item.brand || "";
    galleryCaption.textContent = item.showroom_caption || item.location || "";
    galleryImage.alt = item.name || "";

    updateGallery();
    galleryModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeGallery() {
    galleryModal.hidden = true;
    galleryImage.src = "";
    galleryImages = [];
    galleryIndex = 0;
    document.body.style.overflow = "";
  }

  function nextGallery() {
    if (!galleryImages.length) {
      return;
    }

    galleryIndex = (galleryIndex + 1) % galleryImages.length;
    updateGallery();
  }

  function prevGallery() {
    if (!galleryImages.length) {
      return;
    }

    galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length;
    updateGallery();
  }

  function renderProducts(items) {
    productList.classList.remove("stock-mode");
    productList.innerHTML = items
      .map((item) => productCard(item, allProducts.indexOf(item)))
      .join("");

    countText.textContent = `${items.length.toLocaleString("ko-KR")}개 상품`;
    emptyState.textContent = "검색 결과가 없습니다.";
    emptyState.hidden = items.length !== 0;
  }

  function renderStock(items) {
    productList.classList.add("stock-mode");

    if (stockLoadError) {
      countText.textContent = "Cassina Stock 로딩 실패";
      emptyState.hidden = true;
      productList.innerHTML = `
        <section class="empty-state">
          cassina-stock.csv 파일을 불러오지 못했습니다.<br>
          GitHub 저장소에 파일이 업로드되어 있는지 확인해주세요.
        </section>
      `;
      return;
    }

    const groups = groupStockItems(items);
    const availableTotal = items.reduce((sum, item) => sum + numberValue(item.available_qty), 0);
    const comingTotal = items.reduce((sum, item) => sum + numberValue(item.coming_soon_qty), 0);

    productList.innerHTML = groups.map(stockCard).join("");
    countText.textContent =
      `${groups.length.toLocaleString("ko-KR")}개 모델 · ` +
      `${items.length.toLocaleString("ko-KR")}개 스펙 · ` +
      `Available ${availableTotal.toLocaleString("ko-KR")} pcs · ` +
      `Coming ${comingTotal.toLocaleString("ko-KR")} pcs`;

    emptyState.textContent = "조건에 맞는 Cassina 재고가 없습니다.";
    emptyState.hidden = items.length !== 0;
  }

  function renderInbound(items) {
    productList.classList.add("stock-mode");

    if (inboundLoadError) {
      countText.textContent = "Vitra Stock 로딩 실패";
      emptyState.hidden = true;
      productList.innerHTML = `
        <section class="empty-state">
          vitra-stock.csv 파일을 불러오지 못했습니다.<br>
          GitHub 저장소에 파일이 업로드되어 있는지 확인해주세요.
        </section>
      `;
      return;
    }

    const groups = groupInboundItems(items);
    const total = items.reduce((sum, item) => sum + numberValue(item.total_qty), 0);
    const available = items.reduce((sum, item) => sum + numberValue(item.available_qty), 0);
    const dp = items.reduce((sum, item) => sum + numberValue(item.dp_qty), 0);
    const coming = items.reduce((sum, item) => sum + numberValue(item.coming_qty), 0);

    productList.innerHTML = groups.map(inboundCard).join("");
    countText.textContent =
      `${groups.length.toLocaleString("ko-KR")}개 모델 · ` +
      `${items.length.toLocaleString("ko-KR")}개 스펙 · ` +
      `Total ${total.toLocaleString("ko-KR")} pcs · ` +
      `Available ${available.toLocaleString("ko-KR")} · ` +
      `DP ${dp.toLocaleString("ko-KR")} · ` +
      `Coming ${coming.toLocaleString("ko-KR")}`;

    emptyState.textContent = "조건에 맞는 Vitra 재고가 없습니다.";
    emptyState.hidden = items.length !== 0;
  }


  function renderArtek(items) {
    productList.classList.add("stock-mode");

    if (artekLoadError) {
      countText.textContent = "Artek Stock 로딩 실패";
      emptyState.hidden = true;
      productList.innerHTML = `
        <section class="empty-state">
          artek-stock.csv 파일을 불러오지 못했습니다.<br>
          GitHub 저장소에 파일이 업로드되어 있는지 확인해주세요.
        </section>
      `;
      return;
    }

    const groups = groupInboundItems(items);
    const total = items.reduce((sum, item) => sum + numberValue(item.total_qty), 0);
    const available = items.reduce((sum, item) => sum + numberValue(item.available_qty), 0);
    const dp = items.reduce((sum, item) => sum + numberValue(item.dp_qty), 0);
    const coming = items.reduce((sum, item) => sum + numberValue(item.coming_qty), 0);

    productList.innerHTML = groups.map(artekCard).join("");
    countText.textContent =
      `${groups.length.toLocaleString("ko-KR")}개 모델 · ` +
      `${items.length.toLocaleString("ko-KR")}개 스펙 · ` +
      `Total ${total.toLocaleString("ko-KR")} pcs · ` +
      `Available ${available.toLocaleString("ko-KR")} · ` +
      `DP ${dp.toLocaleString("ko-KR")} · ` +
      `Coming ${coming.toLocaleString("ko-KR")}`;

    emptyState.textContent = "조건에 맞는 Artek 재고가 없습니다.";
    emptyState.hidden = items.length !== 0;
  }

  function getFilteredProducts() {
    const keyword = searchInput.value.trim().toLowerCase();

    return allProducts.filter((item) => {
      const keywordMatch = keyword === "" || item.searchText.includes(keyword);
      const floorMatch = activeMode !== "floor" || item.floor === activeFloor;
      const saleMatch = activeMode !== "sale" || item.dpSale;

      return keywordMatch && floorMatch && saleMatch;
    });
  }

  function getFilteredStock() {
    const keyword = searchInput.value.trim().toLowerCase();

    return stockProducts.filter((item) => {
      const keywordMatch = keyword === "" || item.searchText.includes(keyword);
      const categoryMatch =
        activeStockCategory === "all" ||
        item.categoryKey === activeStockCategory;

      return keywordMatch && categoryMatch;
    });
  }

  function getFilteredInbound() {
    const keyword = searchInput.value.trim().toLowerCase();

    return inboundProducts.filter((item) => {
      const keywordMatch = keyword === "" || item.searchText.includes(keyword);
      const filterMatch = inboundFilterKey(item, activeInboundFilter);
      return keywordMatch && filterMatch;
    });
  }


  function getFilteredArtek() {
    const keyword = searchInput.value.trim().toLowerCase();

    return artekProducts.filter((item) => {
      const keywordMatch = keyword === "" || item.searchText.includes(keyword);
      const filterMatch = inboundFilterKey(item, activeArtekFilter);
      return keywordMatch && filterMatch;
    });
  }

  function updateModeUI() {
    const isStock = activeMode === "stock";
    const isInbound = activeMode === "inbound";
    const isArtek = activeMode === "artek";
    if (stockFilters) stockFilters.hidden = !isStock;
    if (inboundFilters) inboundFilters.hidden = !isInbound;
    if (artekFilters) artekFilters.hidden = !isArtek;

    if (isStock) {
      if (searchInput) searchInput.placeholder = "Cassina 재고: 제품명, 코드, 패브릭, 컬러 검색";
      if (hintText) hintText.textContent = "Cassina Stock Indoor Collection · 2026.08.03 기준 · AVAILABLE은 현재 주문 가능, COMING은 입고 예정 수량입니다.";
    } else if (isInbound) {
      if (searchInput) searchInput.placeholder = "Vitra 재고: 제품명, 컬러, 사양 검색";
      if (hintText) hintText.textContent = "Vitra Stock 26.08.12 기준 · AVAILABLE은 New, DP는 전시 수량, COMING은 to be 수량입니다.";
    } else if (isArtek) {
      if (searchInput) searchInput.placeholder = "Artek 재고: 제품명, 컬러, 사양 검색";
      if (hintText) hintText.textContent = "Artek Stock 26.08.12 기준 · AVAILABLE은 New, DP는 전시 수량, COMING은 to be 수량입니다. 제품 이미지는 PPT에 연결된 이미지 URL을 사용합니다.";
    } else {
      if (searchInput) searchInput.placeholder = "상품명, 브랜드, 디자이너, 소재, 사이즈 검색";
      if (hintText) hintText.textContent = "MORE IMAGE는 쇼룸컷 슬라이드, INFO LINK는 홈페이지 이동입니다.";
    }
  }

  function applyFilters() {
    updateModeUI();

    if (activeMode === "stock") {
      renderStock(getFilteredStock());
      return;
    }

    if (activeMode === "inbound") {
      renderInbound(getFilteredInbound());
      return;
    }

    if (activeMode === "artek") {
      renderArtek(getFilteredArtek());
      return;
    }

    renderProducts(getFilteredProducts());
  }

  function setActiveButton(targetButton) {
    floorButtons.forEach((button) => {
      button.classList.toggle("is-active", button === targetButton);
    });
  }

  function setActiveStockCategory(targetButton) {
    stockCategoryButtons.forEach((button) => {
      button.classList.toggle("is-active", button === targetButton);
    });
  }

  function setActiveInboundFilter(targetButton) {
    inboundFilterButtons.forEach((button) => {
      button.classList.toggle("is-active", button === targetButton);
    });
  }

  function setActiveArtekFilter(targetButton) {
    artekFilterButtons.forEach((button) => {
      button.classList.toggle("is-active", button === targetButton);
    });
  }

  function resetFilters() {
    searchInput.value = "";
    activeMode = "all";
    activeFloor = "";
    activeStockCategory = "all";
    activeInboundFilter = "all";
    activeArtekFilter = "all";

    const allButton = floorButtons.find((button) => button.dataset.type === "all");
    if (allButton) {
      setActiveButton(allButton);
    }

    const allStockButton = stockCategoryButtons.find(
      (button) => button.dataset.stockCategory === "all"
    );
    if (allStockButton) {
      setActiveStockCategory(allStockButton);
    }

    const allInboundButton = inboundFilterButtons.find(
      (button) => button.dataset.inboundFilter === "all"
    );
    if (allInboundButton) {
      setActiveInboundFilter(allInboundButton);
    }

    const allArtekButton = artekFilterButtons.find(
      (button) => button.dataset.artekFilter === "all"
    );
    if (allArtekButton) {
      setActiveArtekFilter(allArtekButton);
    }

    applyFilters();
  }

  async function loadProducts() {
    try {
      const response = await fetch(`${CSV_URL}?v=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`price.csv 로딩 실패: ${response.status}`);
      }

      const csvText = await response.text();
      allProducts = parseCSV(csvText)
        .filter((item) => item.name || item.brand)
        .map((item) => ({
          ...item,
          dpSale: isDPSale(item),
          searchText: makeSearchText(item)
        }));

      applyFilters();
    } catch (error) {
      console.error(error);

      if (activeMode !== "stock" && activeMode !== "inbound" && activeMode !== "artek") {
        countText.textContent = "CSV 로딩 실패";
        productList.innerHTML = `
          <section class="empty-state">
            price.csv 파일을 불러오지 못했습니다.<br>
            GitHub 저장소의 파일명과 위치를 확인해주세요.
          </section>
        `;
      }
    }
  }

  async function loadStock() {
    try {
      const response = await fetch(`${STOCK_CSV_URL}?v=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`cassina-stock.csv 로딩 실패: ${response.status}`);
      }

      const csvText = await response.text();
      stockProducts = parseCSV(csvText)
        .filter((item) => item.model || item.product_code)
        .map((item) => ({
          ...item,
          categoryKey: stockCategoryKey(item.category),
          searchText: makeStockSearchText(item)
        }));

      stockLoadError = null;

      if (activeMode === "stock") {
        applyFilters();
      }
    } catch (error) {
      console.error(error);
      stockLoadError = error;

      if (activeMode === "stock") {
        applyFilters();
      }
    }
  }

  async function loadInbound() {
    try {
      const response = await fetch(`${INBOUND_CSV_URL}?v=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`vitra-stock.csv 로딩 실패: ${response.status}`);
      }

      const csvText = await response.text();
      inboundProducts = parseCSV(csvText)
        .filter((item) => item.product_name || item.product_code)
        .map((item) => ({
          ...item,
          searchText: makeInboundSearchText(item)
        }));

      inboundLoadError = null;

      if (activeMode === "inbound") {
        applyFilters();
      }
    } catch (error) {
      console.error(error);
      inboundLoadError = error;

      if (activeMode === "inbound") {
        applyFilters();
      }
    }
  }


  async function loadArtek() {
    try {
      const response = await fetch(`${ARTEK_CSV_URL}?v=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`artek-stock.csv 로딩 실패: ${response.status}`);
      }

      const csvText = await response.text();
      artekProducts = parseCSV(csvText)
        .filter((item) => item.product_name)
        .map((item) => ({
          ...item,
          searchText: makeInboundSearchText(item)
        }));

      artekLoadError = null;

      if (activeMode === "artek") {
        applyFilters();
      }
    } catch (error) {
      console.error(error);
      artekLoadError = error;

      if (activeMode === "artek") {
        applyFilters();
      }
    }
  }

  floorButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeMode = button.dataset.type || "all";
      activeFloor = button.dataset.value || "";

      setActiveButton(button);
      applyFilters();
    });
  });

  stockCategoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeStockCategory = button.dataset.stockCategory || "all";
      setActiveStockCategory(button);
      applyFilters();
    });
  });

  inboundFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeInboundFilter = button.dataset.inboundFilter || "all";
      setActiveInboundFilter(button);
      applyFilters();
    });
  });


  artekFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeArtekFilter = button.dataset.artekFilter || "all";
      setActiveArtekFilter(button);
      applyFilters();
    });
  });

  productList.addEventListener("click", (event) => {
    const galleryButton = event.target.closest("[data-gallery-index]");
    if (!galleryButton) {
      return;
    }

    openGallery(Number(galleryButton.dataset.galleryIndex));
  });

  galleryPrev.addEventListener("click", prevGallery);
  galleryNext.addEventListener("click", nextGallery);

  galleryDots.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-dot-index]");
    if (!dot) {
      return;
    }

    galleryIndex = Number(dot.dataset.dotIndex);
    updateGallery();
  });

  galleryModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-gallery-close]")) {
      closeGallery();
    }
  });

  galleryModal.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  galleryModal.addEventListener("touchend", (event) => {
    const touchEndX = event.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;

    if (Math.abs(diff) < 45) {
      return;
    }

    if (diff < 0) {
      nextGallery();
    } else {
      prevGallery();
    }
  }, { passive: true });

  document.addEventListener("keydown", (event) => {
    if (galleryModal.hidden) {
      return;
    }

    if (event.key === "Escape") {
      closeGallery();
    }

    if (event.key === "ArrowRight") {
      nextGallery();
    }

    if (event.key === "ArrowLeft") {
      prevGallery();
    }
  });

  searchInput.addEventListener("input", applyFilters);
  resetBtn.addEventListener("click", resetFilters);

  homeBtn.addEventListener("click", () => {
    resetFilters();
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  loadProducts();
  loadStock();
  loadInbound();
  loadArtek();
})();
