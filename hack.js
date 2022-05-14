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
  const [,numVarName] = findGlobal(x => x.toString().match(/0===\w+\.\w+\[\w+\.x\]\[\w+\.y\]\.(\w+)/)) || [];
	const [,genFuncName] = findGlobal(x => x.toString().match(/do\{(\w+)\(\w+\,\w+\)/)) || [];
  
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
  console.log('numVarName', numVarName);
  console.log('gameLoopFuncName', gameLoopFuncName);
  console.log('genFuncName', genFuncName);

  if (!leftVarName || !rightVarName || !middleVarName || !inputFuncName || !mapVarName || !alreadyOpenedVarName || !bombVarName || !flagVarName || !numVarName || !gameLoopFuncName || !genFuncName)
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
    instance[leftVarName] = false;
  }
  
  function rightClick(instance, x, y) {
    instance[leftVarName] = false;
    instance[rightVarName] = true;
    instance[middleVarName] = false;
    const map = extractMap(instance);
    const {x: clickX, y: clickY} = posToClickPos(map, x, y);
    window[inputFuncName](instance, clickX, clickY);
    instance[rightVarName] = false;
  }
  
  function regenerateMap(instance, x, y) {
		window[genFuncName](instance, x, y);
  }
  
  function extractMap(instance) {
    return instance[mapVarName];
  }
  
  function parseSquare(raw) {
    return {
      alreadyOpened: raw[alreadyOpenedVarName],
      bomb: raw[bombVarName],
      flag: raw[flagVarName],
      num: raw[numVarName],
    };
	}
  
  async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function createActionsContainer(map) {
    const actions = [];
    const already = new Set();
    const add = ({x, y, type}) => {
      const hash = y * map.length + x;
      if (already.has(hash)) return;
      already.add(hash);
      actions.push({x, y, type});
    }
    return {actions, add};
  }
  
  function nextHackActions(map) {
    const {actions, add} = createActionsContainer(map);
    for (let x = 0; x < map.length; x++) {
      for (let y = 0; y < map[x].length; y++) {
        const square = map[x][y];
        if (square.flag) continue;
        if (square.alreadyOpened) continue;
        if (square.bomb) {
          add({x,y,type:'right'});
        } else {
        	add({x,y,type:'left'});
        }
      }
    }
    return actions;
  }
  
  function nextLegitActions(map) {
    const {actions, add} = createActionsContainer(map);
    for (let x = 0; x < map.length; x++) {
      for (let y = 0; y < map[x].length; y++) {
        const square = map[x][y];
        if (!square.alreadyOpened) continue;
        if (square.num === 0) continue;

        const nearSquares = near(map, x, y);

        if (nearSquares.length === square.num) {
          for (const {square, x, y} of nearSquares) {
            if (square.flag) continue;
            add({ type: 'right', x, y });
          }
        } else {
          const flaggedSquares = nearSquares.filter(({square}) => square.flag);
          if (flaggedSquares.length >= square.num) {
            for (const {square, x, y} of nearSquares) {
              if (square.flag) continue;
            	add({ type: 'left', x, y });
            }
          }
        }
      }
    }
    return actions;
  }
  
  function near(map, x, y) {
		let near = [];
    if (x > 0) near.push([x-1, y]);
    if (x > 0 && y > 0) near.push([x-1, y-1]);
    if (x > 0 && y < map[x].length-1) near.push([x-1, y+1]);
    if (y > 0) near.push([x, y-1]);
    if (y < map[x].length-1) near.push([x, y+1]);
    if (x < map.length-1) near.push([x+1, y]);
    if (x < map.length-1 && y > 0) near.push([x+1, y-1]);
    if (x < map.length-1 && y < map[x].length-1) near.push([x+1, y+1]);
    return near.map(([_x, _y]) => ({x: _x, y: _y, square: map[_x][_y]})).filter(x => !x.square.alreadyOpened);
  }
  
  function openSquares(map, x, y) {
    const cur = map[x][y];
    if (cur.bomb) return;
    cur.alreadyOpened = true;
    if (cur.num !== 0) return;
    const nearSquares = near(map, x, y);
    for (const {square, x: _x, y: _y} of nearSquares) {
      openSquares(map, _x, _y);
    }
  }
  
  function isSolved(map) {
    const bombs = map.flatMap(col => col.filter(x => x.bomb)).length;
    const flagged = map.flatMap(col => col.filter(x => !x.alreadyOpened)).length;
    return bombs === flagged;
	}
  
  function hasGenerated(map) {
    const bombs = map.flatMap(col => col.filter(x => x.bomb)).length;
    return bombs > 0;
  }
  
  function isSolvable(map, openX=undefined, openY=undefined) {
    if (openX != undefined && openY != undefined) {
      openSquares(map, openX, openY);
    }
    for (let i = 0; i < 100; i++) {
      const actions = nextLegitActions(map);
      if (actions.length === 0) break;
      for (const {type, x, y} of actions) {
        if (type === 'right') {
          map[x][y].flag = true;
        } else if (type === 'left') {
          openSquares(map, x, y);
        }
      }
    }
    return isSolved(map);
	}
  
  async function run() {
    document.getElementById('hack-box')?.remove();
    const elem = document.querySelector('g-dropdown-menu');
    const container = document.createElement('div');
    container.id = 'hack-box';
    container.style = 'position: absolute; top: -30px; width: 700px; display: flex';
    elem.parentElement.insertBefore(container, elem);
    const instance = await getGameInstance();
    [
      {
        name: 'Lucky Game?',
        on: () => {
      		const rawMap = extractMap(instance);
          const map = rawMap.map(col => col.map(parseSquare));
          if (hasGenerated(map)) {
          	showMessage(isSolvable(map) ? 'Solvable :)' : 'Is lucky game :(');
          } else {
          	showMessage('Firstly, generate the game');
          }
        },
      },
      {
        name: 'Gen',
        on: () => {
          const start = Date.now();
          let solvable = false;
          const rawMap = extractMap(instance);
          const width = rawMap.length;
          const height = rawMap[0].length;
          let x;
          let y;
          let gens = 0;
          while (true) {
            gens++;
            x = Math.floor(Math.random() * width);
            y = Math.floor(Math.random() * height);
            regenerateMap(instance, x, y);
            const rawMap = extractMap(instance);
            const map = rawMap.map(col => col.map(parseSquare));
            if (isSolvable(map, x, y)) {
              solvable = true;
          		leftClick(instance, x, y);
              break;
            }
            if (gens % 10 === 0 && Date.now() - start > 1000) break;
          } 
          const end = Date.now();
          const time = end - start;
          if (solvable) {
            showMessage('Generated, solvable :) ' + time + 'ms after ' + gens + ' gens');
          } else {
          	showMessage('Generated, lucky game ' + time + 'ms after ' + gens + ' gens');
      		}
        },
      },
      {
        name: 'Hack solve',
        on: async () => {
          let rawMap = extractMap(instance);
          let map = rawMap.map(col => col.map(parseSquare));
          if (!hasGenerated(map)) {
            leftClick(instance, 0, 0);
            await sleep(100);
          }
          rawMap = extractMap(instance);
          map = rawMap.map(col => col.map(parseSquare));
          
          for (const {x, y, type} of nextHackActions(map)) {
            if (type === 'right') {
              rightClick(instance, x, y);
            } else {
              leftClick(instance, x, y);
            }
            await sleep(10);
          }
        },
      },
      {
        name: 'Legit solve',
        on: async () => {
          let rawMap = extractMap(instance);
          let map = rawMap.map(col => col.map(parseSquare));
          if (!hasGenerated(map)) {
            leftClick(instance, 0, 0);
            await sleep(100);
          }
          for (let i = 0; i < 100; i++) {
            const rawMap = extractMap(instance);
            const map = rawMap.map(col => col.map(parseSquare));
            const actions = nextLegitActions(map);
            if (actions.length === 0) {
              if (!isSolved(map)) {
                showMessage('There\'s no non guessable action');
              }
              break;
            }
            for (const {x, y, type} of actions) {
              if (type === 'right') {
                rightClick(instance, x, y);
              } else {
                leftClick(instance, x, y);
              }
              await sleep(10);
            }
            await sleep(10);
          }
        },
      },
    ].forEach(({name, on}) => {
    	const btn = document.createElement('button');
    	btn.innerHTML = name;
    	btn.style = 'margin-left: 10px';
      btn.onclick = on || (() => {});
    	container.appendChild(btn);
    });
    const label = document.createElement('div');
    label.style = 'margin-left: 10px; color: red';
    container.appendChild(label);
    let showMessageId = 0;
    const showMessage = msg => {
      const id = ++showMessageId;
      label.innerHTML = msg;
      setTimeout(x => {
        if (id === showMessageId) label.innerHTML = '';
      }, 3000);
    }
  }
  
  run();
})();
