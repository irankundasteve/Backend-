const galleryContainer = document.getElementById('gallery');
const galleryTemplate = document.getElementById('gallery-card-template');

async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload;
}

function renderGallery(images, categories) {
  galleryContainer.innerHTML = '';

  if (!images.length) {
    galleryContainer.textContent = 'No images available yet.';
    return;
  }

  images.forEach((image) => {
    const fragment = galleryTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.card');
    const img = card.querySelector('img');
    const title = card.querySelector('.title');
    const meta = card.querySelector('.meta');

    const category = categories.find((entry) => entry.id === image.categoryId);

    img.src = image.url;
    img.alt = image.title;
    title.textContent = image.title;
    meta.textContent = `Category: ${category ? category.name : 'Unknown'} | Edited ${image.edits.length} time(s)`;

    galleryContainer.appendChild(fragment);
  });
}

async function loadGallery() {
  const [images, categories] = await Promise.all([
    fetchJSON('/api/images'),
    fetchJSON('/api/categories')
  ]);
  renderGallery(images, categories);
}

loadGallery().catch((error) => {
  galleryContainer.textContent = `Failed to load gallery: ${error.message}`;
});
