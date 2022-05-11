/*
  Hack developed by vanflux
  Repository: https://github.com/vanflux/google-mine-sweeper-hack
*/

(() => {
	// Google difficulted the things a lot here...

	function findGlobal(func, obj=window) {
    for (let [key, value] of Object.entries(obj)) {
      if (!value) continue;
      try {
				const res = func(value, key);
				if (res) return res;
      } catch (exc) {}
     };
  }

	const protName = findGlobal((x, key) => Object.values(x.prototype).map(x => x.toString().match(/.*0===a\.button.*this\.(\w+).*2===a\.button.*this\.(\w+).*1===a\.button.*this\.(\w+).*,(\w+)\(this.*/)).find(x=>x&&x.length>=2) ? key : undefined);
  if (!protName) throw new Error('Prot name not found, signature scan isnt working anymore');

	const [,leftVarName,rightVarName,middleVarName,inputFuncName] = findGlobal(x => {
		const matches = x.toString().match(/.*0===a\.button.*this\.(\w+).*2===a\.button.*this\.(\w+).*1===a\.button.*this\.(\w+).*,(\w+)\(this.*/);
		if (matches.find(x=>x&&x.length>=2)) return matches;
  }, window[protName].prototype) || [];
  const [,mapVarName,alreadyOpenedVarName] = findGlobal(x => {
    const matches = x.toString().match(/(\w+)\[b\.x\]\[b\.y\]\.(\w+)\=!0;var/);
    if (matches.find(x=>x&&x.length>=2)) return matches;
  }) || [];
  const [,bombVarName] = findGlobal(x => x.toString().match(/\[\w+\.x\]\[\w+\.y\]\.(\w+)\=!0,/)) || [];
  const [,flagVarName] = findGlobal(x => x.toString().match(/\!\w+\.(\w+)\?"DETONATED_MINE"/)) || [];
	const gameLoopFuncName = findGlobal((x, key) => {
    const str = x.toString();
    if (str.includes('this.startTime') && str.includes('this.canvas.height')) return key;
  }, window[protName].prototype);
  
	console.log('protName', protName);
	console.log('leftVarName', leftVarName);
	console.log('rightVarName', rightVarName);
	console.log('middleVarName', middleVarName);
	console.log('inputFuncName', inputFuncName);
  console.log('mapVarName', mapVarName);
	console.log('alreadyOpenedVarName', alreadyOpenedVarName);
	console.log('bombVarName', bombVarName);
	console.log('flagVarName', flagVarName);
  console.log('gameLoopFuncName', gameLoopFuncName);

  if (!leftVarName || !rightVarName || !middleVarName || !inputFuncName || !mapVarName || !alreadyOpenedVarName || !bombVarName || !flagVarName || !gameLoopFuncName)
    throw new Error('Variable not found, signature scan isnt working anymore');

  async function getGameInstance() {
    return new Promise(resolve => {
      // detour game loop function
      const originalFunction = window[protName].prototype[gameLoopFuncName];
      window[protName].prototype[gameLoopFuncName] = function (a) {
        resolve(this);
        window[protName].prototype[gameLoopFuncName] = originalFunction;
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
    instance[leftVarName] = true;
    instance[rightVarName] = false;
    instance[middleVarName] = false;
    const map = extractMap(instance);
    const {x: clickX, y: clickY} = posToClickPos(map, x, y);
    window[inputFuncName](instance, clickX, clickY);
  }
  
  function rightClick(instance, x, y) {
    instance[leftVarName] = false;
    instance[rightVarName] = true;
    instance[middleVarName] = false;
    const map = extractMap(instance);
    const {x: clickX, y: clickY} = posToClickPos(map, x, y);
    window[inputFuncName](instance, clickX, clickY);
  }
  
  function extractMap(instance) {
    return instance[mapVarName];
  }
  
  function parseSquare(raw) {
    return {
      alreadyOpened: raw[alreadyOpenedVarName],
      bomb: raw[bombVarName],
      flag: raw[flagVarName],
    };
	}
  
  async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function solve() {
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
		console.log('type', type);
      if (type === 'right') {
        rightClick(instance, x, y);
      } else {
        leftClick(instance, x, y);
      }
      await sleep(50);
    }
  }
  
  solve();
})()

