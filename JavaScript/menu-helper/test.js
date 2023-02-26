function generateMenu(root, children) {
  const images = [
    'edit',
    'delete',
    'save',
    'check',
    'search',
    'home',
    'close',
    'settings',
    'star',
    'share',
    'ios_share',
    'stadia_controller',
    'favorite',
    'add_circle',
    'refresh',
    'key',
    'shopping_cart_checkout',
    'manage_search',
    'select_check_box',
    'download_for_offline',
    'token',
    'fit_screen',
    'keyboard_command_key',
    'thumb_up',
    'group',
    'build',
    'extension',
    'notifications',
    'mail',
    'call',
    'palette',
    'savings',
    'map',
    'content_copy',
    'content_paste',
    'icecream',
  ];
  const getRandom = (arr) => {
    const random = Math.floor(Math.random() * arr.length);
    return arr[random];
  };
  const createItem = (idx, children = []) => ({
    id: `id_${idx}`,
    title: idx + ' title',
    subtitle: idx + ' sub',
    icon: getRandom(images),
    children: children.map((idxChd) => createItem(idx + '_' + idxChd)),
  });
  const arr = Array.from(Array(root).keys());
  const arrChd = Array.from(Array(children).keys());
  return arr.map((idx) => createItem(idx, arrChd));
}

async function test() {
  const wrapper = document.getElementById('wrapper');

  function showIcon(src) {
    const img = document.createElement('img');
    img.src = src;
    wrapper.append(img);
  }

  updateMenuItems(MENU);
  for (const node of MENU) {
    showIcon(await node.base64Promise);
  }
  console.log(await flattenMenuOptions(MENU))
}

const testParams = {
  iconsSize: 128,
  iconsColor: 'white',
  iconsBgColor: null,
  iconsWeight: null,
  shadowColor: null,
  shadowBlur: 6,
  shadowOffsetX: 0,
  shadowOffsetY: 2
};

console.clear();
prepareVariables(generateMenu(32, 2), testParams);
test();
