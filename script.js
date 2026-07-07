(() => {
  "use strict";

  const CSV_URL = "price.csv";

  const productList = document.getElementById("productList");
  const searchInput = document.getElementById("searchInput");
  const countText = document.getElementById("countText");
  const emptyState = document.getElementById("emptyState");
  const resetBtn = document.getElementById("resetBtn");
  const homeBtn = document.getElementById("homeBtn");
  const floorButtons = Array.from(document.querySelectorAll(".floor-btn"));

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
  let activeMode = "all";
  let activeFloor = "";

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
    productList.innerHTML = items
      .map((item) => productCard(item, allProducts.indexOf(item)))
      .join("");

    countText.textContent = `${items.length.toLocaleString("ko-KR")}개 상품`;
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

  function applyFilters() {
    renderProducts(getFilteredProducts());
  }

  function setActiveButton(targetButton) {
    floorButtons.forEach((button) => {
      button.classList.toggle("is-active", button === targetButton);
    });
  }

  function resetFilters() {
    searchInput.value = "";
    activeMode = "all";
    activeFloor = "";

    const allButton = floorButtons.find((button) => button.dataset.type === "all");
    if (allButton) {
      setActiveButton(allButton);
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
      countText.textContent = "CSV 로딩 실패";
      productList.innerHTML = `
        <section class="empty-state">
          price.csv 파일을 불러오지 못했습니다.<br>
          GitHub 저장소의 파일명과 위치를 확인해주세요.
        </section>
      `;
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
})();
