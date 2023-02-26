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
// INTERFACES
// /////////////////////////////////////


interface InitialParameters {
  iconsSize?: number,
  iconsColor?: string,
  iconsBgColor?: string,
  iconsWeight?: number,
  shadowColor?: string,
  shadowBlur?: number,
  shadowOffsetX?: number,
  shadowOffsetY?: number,
}

interface MenuNode {
  id: string | number,
  title: string,
  subtitle?: string,
  children?: MenuNode[],
  icon?: string,
  base64?: string,
  imageUrl?: string,
  base64Promise?: Promise<string>,
}

interface ImageInfo {
  type: ImageType,
  source: string,
  svgColors: SvgColors,
}

type ImageType = 'base64' | 'svg' | 'jpg' | '';

type IconType = 'rounded' | 'outlined';

interface SvgColors {
  iconColor: string,
  bgColor: string,
}

interface ImageDataInfo {
  base64Data: string,
  mimeType: string
}


// /////////////////////////////////////
// GLOBAL VARIABLES
// /////////////////////////////////////


let MENU: MenuNode[];
let ICONS_COLOR: string;
let ICONS_BACKGROUND: string;
let ICONS_WEIGHT: number;
let IMAGE_SIZE: number;
let CTX_OFFSET: number;
let CTX_HALF_OFFSET: number;
let CTX_SIZE: number;
let CTX_RADIUS: number;
let CTX_SHADOW_BLUR: number;
let CTX_SHADOW_OFFSET_X: number;
let CTX_SHADOW_OFFSET_Y: number;
let CTX_SHADOW_COLOR: string;

const PARSER: DOMParser = new DOMParser();
const IMAGE_DATA_INFO: Map<ImageType, ImageDataInfo> = new Map([
  ['svg', { base64Data: 'image/svg+xml', mimeType: 'image/svg+xml' }],
  ['jpg', { base64Data: 'image/jpeg', mimeType: 'text/plain; charset=x-user-defined' }]
]);


// /////////////////////////////////////
// EXECUTION
// /////////////////////////////////////


function prepareVariables(
  menuItems: MenuNode[],
  parameters: InitialParameters,
): void {
  const {
    iconsSize,
    iconsColor,
    iconsBgColor,
    iconsWeight,
    shadowColor,
    shadowBlur,
    shadowOffsetX,
    shadowOffsetY
  } = parameters;
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

async function render(): Promise<void> {
  updateMenuItems(MENU);
  const flatMenuOptions: Record<string, string> = await flattenMenuOptions(MENU);
  const htmlOutput: string = JSON.stringify(flatMenuOptions);
  document.body.textContent = encodeURIComponent(htmlOutput);
}


// /////////////////////////////////////
// UPDATE ITEMS
// /////////////////////////////////////


function updateMenuItems(menuItems: MenuNode[]): void {
  menuItems.forEach((menuItem: MenuNode): void => {
    const { icon, base64, imageUrl }: MenuNode = menuItem;
    const imageInfo: ImageInfo = {
      type: base64 && 'base64' || icon && 'svg' || imageUrl && 'jpg',
      source: cutBase64DataType(base64) || getMaterialIcon(icon) || imageUrl,
      svgColors: getSvgColors(icon)
    };
    deleteItemProperties(menuItem);
    menuItem.base64Promise = convertImageUrlToBase64(imageInfo);
    if (menuItem.children?.length) updateMenuItems(menuItem.children);
  });
}

function cutBase64DataType(base64: string): string {
  if (!base64 || !base64.includes('base64,')) return base64;
  return base64.split('base64,')[1];
}

function getMaterialIcon(icon: string): string {
  if (!icon) return;
  const separator: string = getIconSeparator(icon);
  if (!separator) return getMaterialIconLink(icon, ICONS_WEIGHT);
  const [iconName, , , iconWeight, iconStyle]: string[] = icon.split(separator);
  return getMaterialIconLink(iconName, parseInt(iconWeight) || ICONS_WEIGHT, iconStyle as IconType);
}

function getSvgColors(icon: string): SvgColors {
  if (!icon) return;
  const separator: string = getIconSeparator(icon);
  if (!separator) return;
  const [, iconColor, bgColor, ,]: string[] = icon.split(separator);
  return { iconColor, bgColor };
}

function getIconSeparator(icon: string): string {
  if (!icon) return;
  const separators: string[] = [';', ':', '|', '/', '=', '+', '*', ',', '.', '#'];
  return separators.find((separator: string) => icon.includes(separator));
}

function getMaterialIconLink(icon: string, weight?: number, style?: IconType): string {
  const iconWeight: string = weight === 400 ? 'default' : `wght${weight}`;
  const iconStyle: IconType = style !== 'rounded' && style !== 'outlined' ? 'rounded' : style;
  return `https://fonts.gstatic.com/s/i/short-term/release/materialsymbols${iconStyle}/${icon}/${iconWeight}/48px.svg`;
}

function deleteItemProperties(item: MenuNode): void {
  delete item.icon;
  delete item.base64;
  delete item.imageUrl;
  const { subtitle, children }: MenuNode = item;
  if (!subtitle) delete item.subtitle;
  if (!children?.length) delete item.children;
}


// /////////////////////////////////////
// TRANSFORMATION AND ASYNC ACTIONS
// /////////////////////////////////////


function convertImageUrlToBase64(image: ImageInfo): Promise<string> {
  if (image.type === 'base64') return Promise.resolve(image.source);
  const info: ImageDataInfo = IMAGE_DATA_INFO.get(image.type);
  const imageResponse: string = getImageFromUrl(image.source, info);
  if (!imageResponse) return Promise.resolve('');
  const base64: string = getColorizedSvgBase64(imageResponse, image, info) || getImageBas64(imageResponse);
  if (image.type === 'svg') return convertSvgToPng(base64, image, info);
  return Promise.resolve(base64);
}

function getImageFromUrl(url: string, info: ImageDataInfo): string {
  const xhr: XMLHttpRequest = new XMLHttpRequest();
  xhr.open('GET', url, false);
  xhr.overrideMimeType(info.mimeType);
  xhr.send(null);
  if (xhr.status !== 200) return;
  return xhr.responseText;
}

function getColorizedSvgBase64(imageResponse: string, image: ImageInfo, info: ImageDataInfo): string {
  if (image.type !== 'svg') return;
  const svgDoc: Document = PARSER.parseFromString(imageResponse, info.base64Data as any);
  const svgElement: HTMLElement = svgDoc.documentElement;
  const svgPathElements: HTMLCollectionOf<SVGPathElement> = svgElement.getElementsByTagName('path');
  for (const element of svgPathElements as any) {
    const color: string = image.svgColors?.iconColor || ICONS_COLOR;
    element.setAttribute('fill', color);
    element.setAttribute('stroke', color);
  }
  const svgString: string = new XMLSerializer().serializeToString(svgElement);
  return btoa(decodeURIComponent(encodeURIComponent(svgString)));
}

function getImageBas64(imageResponse: string): string {
  let binary: string = '';
  for (let i: number = 0; i < imageResponse.length; i++) {
    binary += String.fromCharCode(imageResponse.charCodeAt(i) & 0xff);
  }
  return btoa(binary);
}

async function convertSvgToPng(base64: string, image: ImageInfo, info: ImageDataInfo): Promise<string> {
  return await new Promise((resolve): void => {
    const img: HTMLImageElement = new Image();
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = IMAGE_SIZE;
    canvas.height = IMAGE_SIZE;
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
    ctx.fillStyle = image.svgColors?.bgColor || ICONS_BACKGROUND || getRandomColor();
    ctx.roundRect(0, 0, IMAGE_SIZE, IMAGE_SIZE, CTX_RADIUS);
    ctx.fill();
    img.onload = async (): Promise<void> => {
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
      const dataURL: string = canvas.toDataURL();
      resolve(dataURL);
    };
    img.src = `data:${info.base64Data};base64,${base64}`;
  });
}


// /////////////////////////////////////
// COLORS
// /////////////////////////////////////


function generatePastelHexColor(): string {
  let color: string = '#';
  for (let i: number = 0; i < 3; i++) {
    const pastelValue: number = Math.floor(Math.random() * 128) + 128;
    const hexValue: string = pastelValue.toString(16);
    color += hexValue;
  }
  return color;
}

function getRandomSoftPastelColor() {
  const letters: string = '3456789ABCDEF';
  let color: string = '#';
  for (let i: number = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
}

function getRandomColor(): string {
  return Math.round(Math.random()) ? generatePastelHexColor() : getRandomSoftPastelColor();
}


// /////////////////////////////////////
// CONVERT TO CONTACTS
// /////////////////////////////////////


async function getMenuList(item: MenuNode): Promise<string> {
  const { id, title, subtitle, base64Promise }: MenuNode = item;
  const base64Response: string = await base64Promise;
  const base64: string = cutBase64DataType(base64Response);
  const org: string = subtitle ? `ORG:${subtitle}\n` : '';
  const photo: string = base64 ? `PHOTO;BASE64:${base64}\n` : '';
  return Promise.resolve(`BEGIN:VCARD\nVERSION:4.0\nN:${title}\nNOTE:${id}\n${org}${photo}END:VCARD\n`);
}

async function flattenMenuOptions(options: MenuNode[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  async function flatten(node: MenuNode, key: string | number = '#root'): Promise<void> {
    if (!result[key]) result[key] = '';
    result[key] += await getMenuList(node);
    if (!node.children?.length) return;
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
