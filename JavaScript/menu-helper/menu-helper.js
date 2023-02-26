/**
 * @Copyright
 * Copyright (C) 2023 Sergei Babko (Segich)
 *
 * @Description
 * vCard Menu Helper
 *
 * This JavaScript library is a menu helper that can convert menu objects to vCard menu-like structures.
 * It has a variety of features, such as creating nested items, utilizing images via links or base64 encoding (with or without data type),
 * using Google icons with customizable configurations, specifying image sizes,
 * and generating shadows under icons with customizable positions.
 */


// /////////////////////////////////////
// GLOBAL VARIABLES
// /////////////////////////////////////


let MENU;
let ICONS_COLOR;
let ICONS_BACKGROUND;
let ICONS_WEIGHT;
let IMAGE_SIZE;
let CTX_OFFSET;
let CTX_HALF_OFFSET;
let CTX_SIZE;
let CTX_RADIUS;
let CTX_SHADOW_BLUR;
let CTX_SHADOW_OFFSET_X;
let CTX_SHADOW_OFFSET_Y;
let CTX_SHADOW_COLOR;
const PARSER = new DOMParser();
const IMAGE_DATA_INFO = new Map([
  ['svg', { base64Data: 'image/svg+xml', mimeType: 'image/svg+xml' }],
  ['jpg', { base64Data: 'image/jpeg', mimeType: 'text/plain; charset=x-user-defined' }]
]);


// /////////////////////////////////////
// EXECUTION
// /////////////////////////////////////


function prepareVariables(menuItems, parameters) {
  const { iconsSize, iconsColor, iconsBgColor, iconsWeight, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY } = parameters;
  MENU = menuItems || [];
  IMAGE_SIZE = iconsSize || 93;
  CTX_OFFSET = IMAGE_SIZE * 0.3;
  CTX_HALF_OFFSET = CTX_OFFSET / 2;
  CTX_SIZE = IMAGE_SIZE - CTX_OFFSET;
  CTX_RADIUS = IMAGE_SIZE * 0.2;
  ICONS_COLOR = iconsColor || 'white';
  ICONS_BACKGROUND = iconsBgColor;
  ICONS_WEIGHT = iconsWeight || 400;
  CTX_SHADOW_COLOR = shadowColor || 'rgba(0 0 0 / 20%)';
  CTX_SHADOW_BLUR = shadowBlur || 0;
  CTX_SHADOW_OFFSET_X = shadowOffsetX || 0;
  CTX_SHADOW_OFFSET_Y = shadowOffsetY || 0;
}

async function render() {
  updateMenuItems(MENU);
  const flatMenuOptions = await flattenMenuOptions(MENU);
  const htmlOutput = JSON.stringify(flatMenuOptions);
  document.body.textContent = encodeURIComponent(htmlOutput);
}


// /////////////////////////////////////
// UPDATE ITEMS
// /////////////////////////////////////


function updateMenuItems(menuItems) {
  menuItems.forEach((menuItem) => {
    const { icon, base64, imageUrl } = menuItem;
    const imageInfo = {
      type: base64 && 'base64' || icon && 'svg' || imageUrl && 'jpg',
      source: cutBase64DataType(base64) || getMaterialIcon(icon) || imageUrl,
      svgColors: getSvgColors(icon)
    };
    deleteItemProperties(menuItem);
    menuItem.base64Promise = convertImageUrlToBase64(imageInfo);
    if (menuItem.children?.length) {
      updateMenuItems(menuItem.children);
    }
  });
}

function cutBase64DataType(base64) {
  if (!base64 || !base64.includes('base64,')) {
    return base64;
  }
  return base64.split('base64,')[1];
}

function getMaterialIcon(icon) {
  if (!icon) {
    return;
  }
  const separator = getIconSeparator(icon);
  if (!separator) {
    return getMaterialIconLink(icon, ICONS_WEIGHT);
  }
  const [iconName, , , iconWeight, iconStyle] = icon.split(separator);
  return getMaterialIconLink(iconName, parseInt(iconWeight) || ICONS_WEIGHT, iconStyle);
}

function getSvgColors(icon) {
  if (!icon) {
    return;
  }
  const separator = getIconSeparator(icon);
  if (!separator) {
    return;
  }
  const [, iconColor, bgColor, ,] = icon.split(separator);
  return { iconColor, bgColor };
}

function getIconSeparator(icon) {
  if (!icon) {
    return;
  }
  const separators = [';', ':', '|', '/', '=', '+', '*', ',', '.', '#'];
  return separators.find((separator) => icon.includes(separator));
}

function getMaterialIconLink(icon, weight, style) {
  const iconWeight = weight === 400 ? 'default' : `wght${weight}`;
  const iconStyle = style !== 'rounded' && style !== 'outlined' ? 'rounded' : style;
  return `https://fonts.gstatic.com/s/i/short-term/release/materialsymbols${iconStyle}/${icon}/${iconWeight}/48px.svg`;
}

function deleteItemProperties(item) {
  delete item.icon;
  delete item.base64;
  delete item.imageUrl;
  const { subtitle, children } = item;
  if (!subtitle) {
    delete item.subtitle;
  }
  if (!children?.length) {
    delete item.children;
  }
}


// /////////////////////////////////////
// TRANSFORMATION AND ASYNC ACTIONS
// /////////////////////////////////////


function convertImageUrlToBase64(image) {
  if (image.type === 'base64') {
    return Promise.resolve(image.source);
  }
  const info = IMAGE_DATA_INFO.get(image.type);
  const imageResponse = getImageFromUrl(image.source, info);
  if (!imageResponse) {
    return Promise.resolve('');
  }
  const base64 = getColorizedSvgBase64(imageResponse, image, info) || getImageBas64(imageResponse);
  if (image.type === 'svg') {
    return convertSvgToPng(base64, image, info);
  }
  return Promise.resolve(base64);
}

function getImageFromUrl(url, info) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, false);
  xhr.overrideMimeType(info.mimeType);
  xhr.send(null);
  if (xhr.status !== 200) {
    return;
  }
  return xhr.responseText;
}

function getColorizedSvgBase64(imageResponse, image, info) {
  if (image.type !== 'svg') {
    return;
  }
  const svgDoc = PARSER.parseFromString(imageResponse, info.base64Data);
  const svgElement = svgDoc.documentElement;
  const svgPathElements = svgElement.getElementsByTagName('path');
  for (const element of svgPathElements) {
    const color = image.svgColors?.iconColor || ICONS_COLOR;
    element.setAttribute('fill', color);
    element.setAttribute('stroke', color);
  }
  const svgString = new XMLSerializer().serializeToString(svgElement);
  return btoa(decodeURIComponent(encodeURIComponent(svgString)));
}

function getImageBas64(imageResponse) {
  let binary = '';
  for (let i = 0; i < imageResponse.length; i++) {
    binary += String.fromCharCode(imageResponse.charCodeAt(i) & 0xff);
  }
  return btoa(binary);
}

async function convertSvgToPng(base64, image, info) {
  return await new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_SIZE;
    canvas.height = IMAGE_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = image.svgColors?.bgColor || ICONS_BACKGROUND || getRandomColor();
    ctx.roundRect(0, 0, IMAGE_SIZE, IMAGE_SIZE, CTX_RADIUS);
    ctx.fill();
    img.onload = async () => {
      if (CTX_SHADOW_BLUR || CTX_SHADOW_OFFSET_X || CTX_SHADOW_OFFSET_Y) {
        if (typeof document.getCSSCanvasContext === 'function') { // Safari check
          ctx.shadowColor = CTX_SHADOW_COLOR;
          ctx.shadowOffsetX = CTX_SHADOW_OFFSET_X;
          ctx.shadowOffsetY = CTX_SHADOW_OFFSET_Y;
          ctx.shadowBlur = CTX_SHADOW_BLUR;
        } else {
          ctx.filter = `drop-shadow(${CTX_SHADOW_OFFSET_X}px ${CTX_SHADOW_OFFSET_Y}px ${CTX_SHADOW_BLUR}px ${CTX_SHADOW_COLOR})`;
        }
      }
      ctx.drawImage(img, CTX_HALF_OFFSET, CTX_HALF_OFFSET, CTX_SIZE, CTX_SIZE);
      const dataURL = canvas.toDataURL();
      resolve(dataURL);
    };
    img.src = `data:${info.base64Data};base64,${base64}`;
  });
}


// /////////////////////////////////////
// COLORS
// /////////////////////////////////////


function generatePastelHexColor() {
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const pastelValue = Math.floor(Math.random() * 128) + 128;
    const hexValue = pastelValue.toString(16);
    color += hexValue;
  }
  return color;
}

function getRandomSoftPastelColor() {
  const letters = '3456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
}

function getRandomColor() {
  return Math.round(Math.random()) ? generatePastelHexColor() : getRandomSoftPastelColor();
}


// /////////////////////////////////////
// CONVERT TO CONTACTS
// /////////////////////////////////////


async function getMenuList(item) {
  const { id, title, subtitle, base64Promise } = item;
  const base64Response = await base64Promise;
  const base64 = cutBase64DataType(base64Response);
  const org = subtitle ? `ORG:${subtitle}\n` : '';
  const photo = base64 ? `PHOTO;BASE64:${base64}\n` : '';
  return Promise.resolve(`BEGIN:VCARD\nVERSION:4.0\nN:${title}\nNOTE:${id}\n${org}${photo}END:VCARD\n`);
}

async function flattenMenuOptions(options) {
  const result = {};

  async function flatten(node, key = '#root') {
    if (!result[key]) {
      result[key] = '';
    }
    result[key] += await getMenuList(node);
    if (!node.children?.length) {
      return;
    }
    for (const childNode of node.children) {
      await flatten(childNode, node.id);
    }
  }

  for (const node of options) {
    await flatten(node);
  }
  return result;
}


// /////////////////////////////////////
// USER EXECUTION
// /////////////////////////////////////
