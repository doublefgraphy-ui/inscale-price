const CSV_URL = "price.csv";

const productList = document.getElementById("productList");
const searchInput = document.getElementById("searchInput");
const countText = document.getElementById("countText");
const emptyState = document.getElementById("emptyState");
const resetBtn = document.getElementById("resetBtn");
const floorButtons = document.querySelectorAll(".floor-btn");
const brandHome = document.querySelector(".brand-home");

let allProducts = [];
let activeFloor = "";
let activeSale = false;

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (field || row.length) {
        row.push(field);
        rows.push(row);
      }
      field = "";
      row = "";

      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row = [];
      continue;
    }

    field += char;
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) {
    return [];
  }

  const headers = rows.shift().map((header) =>
    header.trim().replace(/^\uFEFF/, "")
  );

  return rows
    .filter((cols) => cols.some((value) => value && value.trim() !== ""))
    .map((cols) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = cols[index] ? cols[index].trim() : "";
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

function clean(value) {
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
      <strong>${escapeHTML(clean(value))}</strong>
    </div>
  `;
}

function renderProducts(items) {
  productList.innerHTML = "";

  items.forEach((item) => {
    const saleBadge = item.dpSale
      ? `<span class="badge sale">DP SALE</span>`
      : "";

    const warningBadge = item.match_status === "new_or_unmatched"
      ? `<span class="badge warning">이미지 확인 필요</span>`
      : "";

    const imageHTML = item.image
      ? `
        <div class="thumb">
          <img
            src="${escapeHTML(item.image)}"
            alt="${escapeHTML(item.name)}"
            loading="lazy"
            onerror="this.parentElement.innerHTML='<div class=\'no-image\'>NO IMAGE</div>'"
          />
        </div>
      `
      : `
        <div class="thumb">
          <div class="no-image">NO IMAGE</div>
        </div>
      `;

    const links = [];

    if (item.url) {
      links.push(
        `<a class="link-primary" href="${escapeHTML(item.url)}" target="_blank" rel="noopener">Info Link</a>`
      );
    }

    if (item.more_image) {
      links.push(
        `<a class="link-secondary" href="${escapeHTML(item.more_image)}" target="_blank" rel="noopener">More Image</a>`
      );
    }

    const linksHTML = links.length
      ? `<div class="actions">${links.join("")}</div>`
      : "";

    productList.insertAdjacentHTML("beforeend", `
      <article class="card">
        ${imageHTML}

        <div class="card-body">
          <div class="meta">
            <span class="badge dark">${escapeHTML(clean(item.floor))}</span>
            <span class="badge">${escapeHTML(clean(item.location))}</span>
            <span class="badge">${escapeHTML(clean(item.category))}</span>
            ${saleBadge}
            ${warningBadge}
          </div>

          <h2 class="name">${escapeHTML(clean(item.name))}</h2>
          <p class="brand">${escapeHTML(clean(item.brand))}</p>

          <div class="price">${formatPrice(item.price)}</div>

          <div class="spec">
            ${specRow("Designer", item.designer)}
            ${specRow("Size", item.size)}
            ${specRow("Material", item.material)}
            ${specRow("Color", item.color)}
            ${specRow("Origin", item.origin)}
          </div>

          ${item.description ? `<div class="description">${escapeHTML(item.description)}</div>` : ""}
          ${item.note ? `<div class="description">${escapeHTML(item.note)}</div>` : ""}

          ${linksHTML}
        </div>
      </article>
    `);
  });

  countText.textContent = `${items.length.toLocaleString("ko-KR")}개 상품`;
  emptyState.hidden = items.length !== 0;
}

function applyFilters() {
  const keyword = searchInput.value.trim().toLowerCase();

  const filtered = allProducts.filter((item) => {
    const matchKeyword = !keyword || item.searchText.includes(keyword);
    const matchFloor = !activeFloor || item.floor === activeFloor;
    const matchSale = !activeSale || item.dpSale;

    return matchKeyword && matchFloor && matchSale;
  });

  renderProducts(filtered);
}

function setActiveButton(clickedButton) {
  floorButtons.forEach((button) => {
    button.classList.remove("is-active");
  });
  clickedButton.classList.add("is-active");
}

function resetFilters() {
  searchInput.value = "";
  activeFloor = "";
  activeSale = false;

  const allButton = document.querySelector('.floor-btn[data-floor=""]');
  if (allButton) {
    setActiveButton(allButton);
  }

  applyFilters();
}

async function loadCSV() {
  try {
    const response = await fetch(`${CSV_URL}?v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("CSV 파일을 불러오지 못했습니다.");
    }

    const csvText = await response.text();
    allProducts = parseCSV(csvText)
      .filter((item) => item.name || item.brand)
      .map((item) => {
        item.dpSale = isDPSale(item);
        item.searchText = makeSearchText(item);
        return item;
      });

    renderProducts(allProducts);
  } catch (error) {
    console.error(error);
    countText.textContent = "CSV 로딩 실패";
    productList.innerHTML = `
      <section class="empty-state">
        price.csv 파일을 찾을 수 없습니다.<br />
        GitHub 저장소에 price.csv 파일이 index.html과 같은 위치에 있는지 확인해주세요.
      </section>
    `;
  }
}

floorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const floor = button.dataset.floor;
    const sale = button.dataset.sale;

    activeFloor = floor || "";
    activeSale = Boolean(sale);

    if (activeSale) {
      activeFloor = "";
    }

    setActiveButton(button);
    applyFilters();
  });
});

if (brandHome) {
  brandHome.addEventListener("click", (event) => {
    event.preventDefault();
    resetFilters();
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

searchInput.addEventListener("input", applyFilters);
resetBtn.addEventListener("click", resetFilters);

loadCSV();
