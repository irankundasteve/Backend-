const categoryForm = document.getElementById('category-form');
const categoryNameInput = document.getElementById('category-name');
const categoryList = document.getElementById('category-list');
const uploadForm = document.getElementById('upload-form');
const imageTitleInput = document.getElementById('image-title');
const imageCategorySelect = document.getElementById('image-category');
const imageFileInput = document.getElementById('image-file');
const imagesContainer = document.getElementById('images');
const imageTemplate = document.getElementById('image-card-template');

let categories = [];
let images = [];

async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload;
}

function findCategoryName(id) {
  const category = categories.find((entry) => entry.id === id);
  return category ? category.name : 'Unknown';
}

function renderCategories() {
  imageCategorySelect.innerHTML = '';
  categoryList.innerHTML = '';

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    imageCategorySelect.appendChild(option);

    const row = document.createElement('li');
    row.className = 'category-row';

    const label = document.createElement('span');
    label.textContent = category.name;

    const renameButton = document.createElement('button');
    renameButton.type = 'button';
    renameButton.textContent = 'Rename';
    renameButton.addEventListener('click', async () => {
      const name = prompt('New category name:', category.name);
      if (!name) return;
      await fetchJSON(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      await loadData();
    });

    row.append(label, renameButton);
    categoryList.appendChild(row);
  });
}

function renderImages() {
  imagesContainer.innerHTML = '';

  if (!images.length) {
    imagesContainer.textContent = 'No images uploaded yet.';
    return;
  }

  images.forEach((image) => {
    const fragment = imageTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.card');
    const img = card.querySelector('img');
    const title = card.querySelector('.title');
    const meta = card.querySelector('.meta');
    const form = card.querySelector('.edit-form');

    img.src = image.url;
    img.alt = image.title;
    title.textContent = image.title;
    meta.textContent = `Category: ${findCategoryName(image.categoryId)} | Edits: ${image.edits.length}`;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {
        text: formData.get('text'),
        x: Number(formData.get('x')),
        y: Number(formData.get('y')),
        size: Number(formData.get('size')),
        color: formData.get('color')
      };

      try {
        await fetchJSON(`/api/images/${image.id}/edit`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        await loadData();
      } catch (error) {
        alert(error.message);
      }
    });

    imagesContainer.appendChild(fragment);
  });
}

async function loadData() {
  categories = await fetchJSON('/api/categories');
  images = await fetchJSON('/api/images');
  renderCategories();
  renderImages();
}

categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await fetchJSON('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryNameInput.value })
    });
    categoryForm.reset();
    await loadData();
  } catch (error) {
    alert(error.message);
  }
});

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const file = imageFileInput.files[0];
  if (!file) {
    alert('Select an image file first.');
    return;
  }

  const formData = new FormData();
  formData.append('title', imageTitleInput.value);
  formData.append('categoryId', imageCategorySelect.value);
  formData.append('image', file);

  try {
    await fetchJSON('/api/images', {
      method: 'POST',
      body: formData
    });
    uploadForm.reset();
    await loadData();
  } catch (error) {
    alert(error.message);
  }
});

loadData().catch((error) => {
  imagesContainer.textContent = `Failed to load data: ${error.message}`;
});
