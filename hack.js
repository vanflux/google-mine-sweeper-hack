/*
  Hack developed by vanflux
  Repository: https://github.com/vanflux/google-mine-sweeper-hack
*/

(() => {
  async function getGameInstance() {
    return new Promise(resolve => {
      // detour game loop function
      const originalFunction = s_8D.prototype.xm;
      s_8D.prototype.xm = function (a) {
        resolve(this);
        s_8D.prototype.xm = originalFunction;
        return originalFunction.call(this, a);
      }
    });
  }
  
  function posToClickPos(map, x, y) {
    const canvas = document.querySelector('canvas');
    const {width, height} = canvas;
    const cols = map.length;
    const rows = map[0].length;
    const squareWidth = width / cols;
    const squareHeight = height / rows;
    return { x: squareWidth * x + squareWidth / 2, y: squareHeight * y + squareHeight / 2};
  }
  
  function leftClick(instance, x, y) {
    instance.Na = true;
    instance.Tc = false;
    instance.Ic = false;
    const map = extractMap(instance);
    const {x: clickX, y: clickY} = posToClickPos(map, x, y);
    s_Xwd(instance, clickX, clickY);
  }
  
  function rightClick(instance, x, y) {
    instance.Na = false;
    instance.Tc = true;
    instance.Ic = false;
    const map = extractMap(instance);
    const {x: clickX, y: clickY} = posToClickPos(map, x, y);
    s_Xwd(instance, clickX, clickY);
  }
  
  function extractMap(instance) {
    return instance.ka;
  }
  
  function parseSquare(raw) {
    return {
      alreadyOpened: raw.Br,
      color: raw.color,
      number: raw.kL,
      bomb: raw.mK,
      flag: raw.Rv,
      framesSinceLastFlag: raw.DPa,
    };
	}
  
  async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function solve1() {
    const instance = await getGameInstance();
    let map = extractMap(instance);
    for (let x in map) {
      for (let y in map[x]) {
        map = extractMap(instance);
        const square = parseSquare(map[x][y]);
        if (square.flag) continue;
        if (square.alreadyOpened) continue;
        if (square.bomb) {
          rightClick(instance, x, y);
        } else {
          leftClick(instance, x, y);
        }
        await sleep(50);
      }
    }
  }
  
  async function solve2() {
    const instance = await getGameInstance();
    while(true) {
      const map = extractMap(instance);
      const actions = map.map((col, x) => {
        return col.map((item, y) => {
          const square = parseSquare(map[x][y]);
          if (square.flag) return;
          if (square.alreadyOpened) return;
          if (square.bomb) return {x,y,type:'right'};
          return {x,y,type:'left'};
        });
      }).flatMap(x=>x).filter(x=>x);
      if (actions.length === 0) break;
      const {x,y,type} = actions[Math.floor(Math.random() * actions.length)];
      if (type === 'right') {
        rightClick(instance, x, y);
      } else {
        leftClick(instance, x, y);
      }
      await sleep(50);
    }
  }
  
  solve2();
})()