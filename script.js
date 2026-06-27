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

  let allProducts = [];
  let activeMode = "all";
  let activeFloor = "";

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

  function formatPrice(value) {
    const raw = String(value || "").trim();

    if (!raw) {
      return "가격 문의";
    }

    const hasText = /[가-힣A-Za-z]/.test(raw);
    const hasLineBreak = raw.includes("\n");
    const hasWon = raw.includes("₩") || raw.includes("\\");
    const digitOnly = raw.replace(/[^0-9]/g, "");

    if (!hasText && !hasLineBreak && !hasWon && digitOnly) {
      return `₩${Number(digitOnly).toLocaleString("ko-KR")}`;
    }

    return escapeHTML(raw.replace(/\\/g, "₩"));
  }

  function isDPSale(item) {
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

  function specRow(label, value) {
    return `
      <div class="spec-row">
        <span>${label}</span>
        <strong>${escapeHTML(displayValue(value))}</strong>
      </div>
    `;
  }

  function productCard(item) {
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

    const dpBadge = item.dpSale
      ? `<span class="badge sale">DP SALE</span>`
      : "";

    const warningBadge = item.match_status === "new_or_unmatched"
      ? `<span class="badge warning">이미지 확인 필요</span>`
      : "";

    const infoLink = item.url
      ? `<a class="link-primary" href="${escapeHTML(item.url)}" target="_blank" rel="noopener">Info Link</a>`
      : "";

    const moreImageLink = item.more_image
      ? `<a class="link-secondary" href="${escapeHTML(item.more_image)}" target="_blank" rel="noopener">More Image</a>`
      : "";

    const actions = infoLink || moreImageLink
      ? `<div class="actions">${infoLink}${moreImageLink}</div>`
      : "";

    const description = item.description
      ? `<div class="description">${escapeHTML(item.description)}</div>`
      : "";

    const note = item.note
      ? `<div class="description">${escapeHTML(item.note)}</div>`
      : "";

    return `
      <article class="card">
        ${imageHTML}

        <div class="card-body">
          <div class="meta">
            <span class="badge dark">${escapeHTML(displayValue(item.floor))}</span>
            <span class="badge">${escapeHTML(displayValue(item.location))}</span>
            <span class="badge">${escapeHTML(displayValue(item.category))}</span>
            ${dpBadge}
            ${warningBadge}
          </div>

          <h2 class="name">${escapeHTML(displayValue(item.name))}</h2>
          <p class="brand">${escapeHTML(displayValue(item.brand))}</p>

          <div class="price">${formatPrice(item.price)}</div>

          <div class="spec">
            ${specRow("Designer", item.designer)}
            ${specRow("Size", item.size)}
            ${specRow("Material", item.material)}
            ${specRow("Color", item.color)}
            ${specRow("Origin", item.origin)}
          </div>

          ${description}
          ${note}
          ${actions}
        </div>
      </article>
    `;
  }

  function renderProducts(items) {
    productList.innerHTML = items.map(productCard).join("");
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
      const type = button.dataset.type;

      activeMode = type || "all";
      activeFloor = button.dataset.value || "";

      setActiveButton(button);
      applyFilters();
    });
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
