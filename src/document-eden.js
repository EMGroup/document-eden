status = [];
error = [];

const TYPE_OBSERVABLE = 1;
const TYPE_EXPRESSION = 0;
const TYPE_ASSIGNMENT = 2;
const TYPE_DEFINITION = 3;
const TYPE_INVALID = -1;

DocumentEden = {};

DocumentEden.Utils = {};

let debounceTimeout = null;

let handleInput = (ev) => {
	if(ev.target.matches("select")){
		root.lookup(ev.target.parentElement.getAttribute("data-observable")).assign(ev.target.options[ev.target.selectedIndex].value, root.scope, EdenSymbol.jsAgent);
		return;
	}
	clearTimeout(debounceTimeout);
	debounceTimeout = setTimeout(() => {
		let t = document.querySelector("#observableEditor input");
		if (Number(t.value).toString() == t.value) {
			root.lookup(t.parentElement.getAttribute("data-observable")).assign(Number(t.value), root.scope, EdenSymbol.jsAgent);
		} else {
			root.lookup(t.parentElement.getAttribute("data-observable")).assign(t.value, root.scope, EdenSymbol.jsAgent);
		}
	}, 100);
}

let startPos;
let startPosY;
let startVal;
let obsChange = false;

document.addEventListener("DOMContentLoaded", () => {
	console.log("Ready, initialising eden");
	eden = new Eden();
	eden.ready.then(() => {
		edenUI = new EdenUI(eden);
		eden.root.lookup("jseden_parser_cs3").assign(true, eden.root.scope, EdenSymbol.defaultAgent);
		eden.root.lookup("jseden_parser_cs3").addJSObserver("parser", (sym, value) => {
			if (value) {
				Eden.AST.version = Eden.AST.VERSION_CS3;
			} else {
				Eden.AST.version = Eden.AST.VERSION_CS2;
			}
		});

		root = eden.root;
		DocumentEden.loadLanguage("en", async () => {
			Eden.Project.newFromExisting("NewProject", eden);
			Eden.Project.listenTo("load", this, async () => {
				DocumentEden.setupEdenQueries();
				DocumentEden.loadPlugin("ScriptInput").then(() => {
					DocumentEden.loadPlugin("Canvas2D").then(() => {
						window.edenProjectLoadedResolve();
						setTimeout(
							() => {
								document.querySelectorAll(".eden-picture").forEach((ele) => {
									DocumentEden.initializeCanvas(ele);
								});
							}, 1000
						)
					});
				});
			});
		});
	});

	if (document.querySelector("#observableEditor") == undefined) {
		let obsEditor = document.createElement("div");
		obsEditor.id = "observableEditor";
		obsEditor.setAttribute("draggable", false);
		let input = document.createElement("input");
		input.setAttribute("type", "number");
		input.setAttribute("draggable", false);
		if (document.querySelector(".slides")) {
			document.querySelector(".slides").appendChild(obsEditor);
		} else {
			document.querySelector("body").appendChild(obsEditor);
		}
		obsEditor.appendChild(input);
		let select = document.createElement("select");
		obsEditor.appendChild(select);
	}
	document.querySelector("#observableEditor input").addEventListener("input", handleInput);
	document.querySelector("#observableEditor select").addEventListener("change", handleInput);
	document.addEventListener("keypress", (ev) => {
		if (ev.target.matches("span.observable")) {
			showObservableEditor(ev.target);
			ev.stopPropagation();
		}
	});
	document.addEventListener("mousemove", (ev) => {
		if (obsChange) {
			mouseMove(ev);
			ev.preventDefault();
		}
	});
	document.addEventListener("dragstart", (ev) => {
		ev.preventDefault();
		ev.stopPropagation();
	})
	document.addEventListener("mouseup", (ev) => {
		obsChange = false;
	});
	document.querySelector("#observableEditor input").addEventListener("keypress", (ev) => {
		if (ev.key == "Enter") {
			ev.preventDefault();

			document.querySelector("#observableEditor").classList.remove("active");
		}
		obsChange = false;
	});
	document.querySelector('#observableEditor input').addEventListener('mouseup', (e) => {
		obsChange = false;
		e.stopPropagation();
	});
	document.querySelector('#observableEditor input').addEventListener('blur', (e) => {
		if (obsChange)
			handleInput(ev);
		document.querySelector("#observableEditor").classList.remove("active");
		obsChange = false;
	});

	document.querySelector('#observableEditor select').addEventListener('blur', (e) => {
		document.querySelector("#observableEditor").classList.remove("active");
		obsChange = false;
	});

	document.querySelector('body').addEventListener('click', (e) => {
		if(!e.target.matches("body"))
			return;
		document.querySelector("#observableEditor").classList.remove("active");
		obsChange = false;
	});

	document.querySelector('#observableEditor input').addEventListener('mousedown', (e) => {
		startPos = e.clientX;
		startPosY = e.clientY
		startVal = parseFloat(e.target.value);
		console.log("Starting value of ", startVal);
		if (isNaN(startVal)) {
			startVal = 0;
		}
		obsChange = true;
		e.stopPropagation();
	});

	document.addEventListener("click", e => {
		if (e.target.matches(".showhidecode")) {
			e.target.nextSibling.classList.toggle("invisible");
		}
		if (e.target.matches(".observable")) {
			showObservableEditor(e.target);
		}
		// else if(e.target.closest("#observableEditor") == undefined){
		// 	document.querySelector("#observableEditor").classList.remove("active");
		// }

		if (e.target.matches(".runAction")) {
			DocumentEden.runAction(e.target.getAttribute("data-action"));
			e.stopPropagation();
		}
	});
	document.querySelector('#observableEditor input').addEventListener('select', () => {
		this.selectionStart = this.selectionEnd;
	}, false);
}, 3000);

function mouseMove(e) {
	const delta = Math.ceil(e.clientX - startPos);
	const deltay = Math.max(1, (startPosY - e.clientY) / 10);
	const incVal = Math.round(Math.sign(delta) * (Math.abs(delta) * (deltay + 1)) / 10);
	const newVal = startVal + incVal;
	if (newVal < 0) newVal = 0;
	handleInput(e);
}

function sanitiseResult(r, type, ele) {
	// if(r == undefined && type != "maths")
	// return "&#129335";
	// if(r == undefined && type == "maths")
	// console.log(ele);
	// if(typeof r == 'string'){
	// 	console.log(r.substring(0,8));
	// 	if(r.substring(0,5) == "<?xml"){
	// 		var err = new Error();
	// 		console.log(err.stack);
	// 	}
	// }
	if (r == undefined)
		return "?";
	else return r;
}

DocumentEden.setupEdenQueries = function () {
	document.querySelectorAll("[data-query]").forEach((e) => {
		console.log("data-query", e);
		let atts = e.getAttributeNames();
		atts.forEach(att => {
			let jseden = e.getAttribute(att);
			if (!jseden.includes("£")) {
				return;
			}
			let parts = [];
			let dependList = [];
			console.log(jseden);
			const data2 = splitAtDelimiters(jseden, [{ left: '£', right: '£', maths: false }]);
			console.log(data2);
			for (let j = 0; j < data2.length; j++) {
				if (data2[j].type == "jseden") {
					parts[j] = { type: "jseden", expression: data2[j].data };
					dependList.push(data2[j].data);
				} else {
					parts[j] = { type: "text", data: data2[j].data };
				}
			}
			if (e.getAttribute("data-eden-update") == undefined) {
				e.setAttribute("data-eden-update", ++dependenciesCreated);
			}
			let updateFunction = () => {
				let expression = "";
				try {
					for (let j = 0; j < parts.length; j++) {
						if (parts[j].type == "jseden") {
							let obs = parts[j].expression;
							let type = checkTokens(obs);
							if (type == TYPE_EXPRESSION) {
								obs = "DOCUMENT_EDEN_" + DocumentEden.Utils.simpleHash(parts[j].expression);
							}
							expression = expression + sanitiseResult(root.lookup(obs).value());
						} else {
							expression = expression + parts[j].data;
						}
					}
				} catch (ex) {
					console.log(ex);
					expression = "Error";
				}
				e.setAttribute(att, expression);
			}
			dependList.forEach((expr) => {
				DocumentEden.createDependency(expr, e.getAttribute("data-eden-update"), updateFunction);
			});
		});
		//Pound for all attributes
	});
	let codeTagScripts = 0;
	const edenScripts = document.querySelectorAll("script[type='text/jseden'],pre[type='text/jseden']");
	const executeScriptsSeq = async () => {
		for (const ele of edenScripts) {
			let actionName = ele.getAttribute("data-action");
			if (actionName == undefined) {
				actionName = "codeTag" + ++codeTagScripts;
				ele.setAttribute("data-action", actionName);
			}
			await DocumentEden.executeJSEdenScript(ele.innerText, actionName);
		}
	};
	executeScriptsSeq().then(() => {
		let scriptViews = 0;
		document.querySelectorAll("script.display,pre.display").forEach((ele) => {
			let actionName = ele.getAttribute("data-action");
			const w = (ele.getAttribute("data-width") === null) ? 600 : ele.getAttribute("data-width");
			const h = (ele.getAttribute("data-height") === null) ? 300 : ele.getAttribute("data-height");
			let embedViewName = "sv" + actionName;
			let scriptView = edenUI.createEmbedded(embedViewName, "ScriptInput", "svn" + actionName, this);
			root.lookup("view_" + embedViewName + "_tabs").assign(["> " + actionName], root.scope, EdenSymbol.jsAgent);
			root.lookup("view_" + embedViewName + "_current").assign(0, root.scope, EdenSymbol.jsAgent);
			root.lookup("view_" + embedViewName + "_height").assign(h, root.scope, EdenSymbol.jsAgent);
			root.lookup("view_" + embedViewName + "_width").assign(w, root.scope, EdenSymbol.jsAgent);
			root.lookup("view_" + embedViewName + "_showtabs").assign(false, root.scope, EdenSymbol.jsAgent);
			root.lookup("view_" + embedViewName + "_showbuttons").assign(false, root.scope, EdenSymbol.jsAgent);
			let newEle = document.createElement("div");
			newEle.style.position = "relative";
			newEle.style.width = w + "px";
			newEle.style.height = h + "px";
			// newEle.style.fontSize = "0.4em";
			let newEleShowHide = document.createElement("a");
			newEleShowHide.classList.add("showhidecode");
			newEleShowHide.innerText = "Show/hide code";
			ele.parentElement.insertBefore(newEle, ele);
			ele.parentElement.insertBefore(newEleShowHide, newEle);
			newEle.appendChild(scriptView.contents[0]);

			// document.getElementById("myscript").appendChild(scriptView.contents[0]);
		});
	});
}

DocumentEden.run = function(edenScript){
	return new Promise((resolve, reject) =>{
		let myFragment = new Eden.Fragment("tmp", () => {
			myFragment.setSourceInitial(edenScript);
			myFragment.ast.execute(EdenSymbol.defaultAgent, root.scope, resolve);
		});
	});
}

DocumentEden.executeJSEdenScript = function (edenScript, scriptName) {
	return new Promise((resolve, reject) => {
		console.log("Creating script", scriptName);
		let myFragment = new Eden.Fragment(scriptName, () => {
			myFragment.setSourceInitial(edenScript);
			myFragment.makeReal(scriptName);
			myFragment.ast.execute(EdenSymbol.defaultAgent, root.scope, resolve);
		});
	});
}


DocumentEden.initializeCanvas = function (ele) {
	let canvasName = ele.getAttribute("data-observable");
	let initialWidth = eden.root.lookup(`view_${canvasName}_width`).value();
	let initialHeight = eden.root.lookup(`view_${canvasName}_height`).value();
	if (initialWidth == undefined) {
		eden.root.lookup(`view_${canvasName}_width`).assign(ele.offsetWidth, root.scope, EdenSymbol.jsAgent);
	} else {
		ele.style.width = initialWidth + "px";
	}
	if (initialHeight == undefined) {
		eden.root.lookup(`view_${canvasName}_height`).assign(ele.offsetWidth, root.scope, EdenSymbol.jsAgent);
	} else {
		ele.style.height = initialHeight + "px";
	}
	let newCanvasView = edenUI.createEmbedded(canvasName, "Canvas2D", canvasName, this);
	ele.appendChild(newCanvasView.contents[0]);

	DocumentEden.addJSObserver(`view_${canvasName}_width`, (sym, value) => {
		ele.style.width = value + "px";
	});
	DocumentEden.addJSObserver(`view_${canvasName}_height`, (sym, value) => {
		ele.style.height = value + "px";
	});
	eden.root.lookup(`view_${canvasName}_scale`).assign(1, eden.root.scope, EdenSymbol.jsAgent);
}

DocumentEden.addJSObserver = function (symName, func) {
	eden.root.lookup(symName).addJSObserver(symName + "_update", (sym, value) => {
		func(sym, value);
	});
}

DocumentEden.loadPlugin = function (pluginName) {
	return new Promise((resolve, reject) => {
		edenUI.loadPlugin(pluginName, EdenSymbol.defaultAgent, resolve);
	});
};

DocumentEden.runAction = function (actionName, cb) {
	console.log("Running action", actionName);
	if (!(actionName.includes(">"))) {
		actionName = "> construal > " + actionName;
	}
	Eden.Selectors.execute(actionName, root.scope, () => {
		if (cb !== undefined)
			cb();
	});
}

DocumentEden.refreshElement = function (element = document) {
	DocumentEden.renderJSEden(element);
	element.querySelectorAll(".eden-picture").forEach((ele) => {
		let canvasName = ele.getAttribute("data-observable");
		DocumentEden.initializeCanvas(ele);
	});
}


function showObservableEditor(target) {
	let obsEditor = document.querySelector("#observableEditor");
	if (target.closest("section")) {
		target.closest("section").append(obsEditor);
	}
	if(target.matches(".selector")){
		obsEditor.querySelector("input").style.display = 'none';
		let selectEle = obsEditor.querySelector("select");
		selectEle.textContent = '';
		selectEle.style.display = 'inline-block';
		let values = target.getAttribute("data-values").split("|");
		let selValue = 0;
		for(let i = 0; i < values.length; i++){
			if(values[i] == target.innerText){
				selValue = i;
			}			
			let option = document.createElement("option");
			option.setAttribute("value", values[i]);
			option.innerText = values[i];
			selectEle.appendChild(option);
		}
		selectEle.options[selValue].defaultSelected = true;
	}else{
		obsEditor.querySelector("input").style.display = 'inline-block';
		obsEditor.querySelector("select").style.display = 'none';
		if (DocumentEden.Utils.isNumeric(target.innerText)) {
			obsEditor.querySelector("input").setAttribute("type", "number");
		} else {
			obsEditor.querySelector("input").setAttribute("type", "text");
		}
	}
	obsEditor.classList.add("active");
	obsEditor.setAttribute("data-observable", target.getAttribute("data-observable"));
	obsEditor.querySelector("input").value = target.innerText;
	obsEditor.style.left = target.offsetLeft + 'px';
	obsEditor.style.top = (target.offsetTop + target.offsetHeight) + 'px';
	obsEditor.querySelector("input").focus();
	obsEditor.querySelector("input").setAttribute("tabindex", Number(target.getAttribute("tabindex")) + 1);
}


DocumentEden.loadLanguage = function (lang, callback) {
	$.getScript(URLUtil.prefix + "js/language/" + lang + ".js", function (data) {
		Language.language = lang;
		// TODO: Could remove need for eval by changing the language to a JSON file
		eval(data);
		callback();
	});
}

let tabIndexOffset = 1;

DocumentEden.renderJSEden = (element) => {
	//Based on KaTex rendering https://github.com/KaTeX/KaTeX/blob/fbbea3573439d51e6568356f5886053b111b1f88/contrib/auto-render/auto-render.js#L53
	for (let i = 0; i < element.childNodes.length; i++) {
		const childNode = element.childNodes[i];
		if (childNode.nodeType === 3) {
			// Text node
			// Concatenate all sibling text nodes.
			// Webkit browsers split very large text nodes into smaller ones,
			// so the delimiters may be split across different nodes.
			let textContentConcat = childNode.textContent;
			let sibling = childNode.nextSibling;
			let nSiblings = 0;
			while (sibling && (sibling.nodeType === Node.TEXT_NODE)) {
				textContentConcat += sibling.textContent;
				sibling = sibling.nextSibling;
				nSiblings++;
			}
			let svgMode = false;
			if(childNode.parentElement.getAttribute("xmlns") == "http://www.w3.org/2000/svg" || childNode.parentElement.nodeName == "g"){
				svgMode = true;
			}
			// console.log(childNode.parentElement);
			const frag = DocumentEden.renderJSEdenInText(textContentConcat,svgMode);
			if (frag) {
				// Remove extra text nodes
				for (let j = 0; j < nSiblings; j++) {
					childNode.nextSibling.remove();
				}
				i += frag.childNodes.length - 1;
				element.replaceChild(frag, childNode);
			} else {
				// If the concatenated text does not contain math (or jseden)
				// the siblings will not either
				i += nSiblings;
			}
		} else if (childNode.nodeType === 1) {
			DocumentEden.renderJSEden(childNode);
		}
		// Otherwise, it's something else, and ignore it.
	}
}

DocumentEden.renderJSEdenInText = function(text,svgMode) {
    const data = splitAtDelimiters(text, [{left: '£', right: '£', maths:false},{left: '€', right: '€', maths: true}]);
	if (data.length === 1 && data[0].type === 'text') {
        // There is no JSEden in the text.
        // Let's return null which means there is no need to replace
        // the current text node with a new one.
        return null;
    }
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < data.length; i++) {
        if (data[i].type === "text") {
            fragment.appendChild(document.createTextNode(data[i].data));
        } else {
			let span;
			if(svgMode){
				span = document.createElementNS("http://www.w3.org/2000/svg", "g");
				// debugger;
			}else{
				span = document.createElement("span");
			}

            let jseden = data[i].data;
			let type = data[i].type;
            try {
				jseden = jseden.replaceAll("€","$");
				if(type == "jseden"){
					let type = checkTokens(jseden);
					if(type == TYPE_ASSIGNMENT || type == TYPE_DEFINITION ){
						let split = jseden.split("=");
						span.classList.add("observable");
						span.setAttribute("tabindex",tabIndexOffset);
						tabIndexOffset = tabIndexOffset + 2;
						let obsName = split[0].trim();
						let value = split[1].trim();
						if(DocumentEden.Utils.isNumeric(value)){
							value = Number(value);
							root.lookup(obsName).assign(value,root.scope,EdenSymbol.jsAgent);
						}else{
							let values = value.split("|");
							if(values.length > 1){
								span.classList.add("selector");
								span.setAttribute("data-values",value);
								root.lookup(obsName).assign(values[0],root.scope,EdenSymbol.jsAgent);
							}else{
							root.lookup(obsName).assign(value,root.scope,EdenSymbol.jsAgent);
							}
						}
						span.setAttribute("data-observable",obsName);
						jseden = obsName;
					}
					// console.log("Should create dependency for ", jseden, "for", span);
					if(span.getAttribute("data-eden-update") == undefined){
						span.setAttribute("data-eden-update",++dependenciesCreated);
					}
					DocumentEden.createDependency(jseden,span.getAttribute("data-eden-update"),(sym,value)=>{
						// console.log("Updating value for",span, "to",value);
						//Edit here to allow duplication
						if(span.tagName == "g"){
							// debugger;
						}
						span.innerHTML = sanitiseResult(value,"image",span);
						if(window.Reveal){
							Reveal.renderMath(span);
						}
					});
				}else if(type == "jsedenmaths"){
					let parts = [];
					let dependList = [];
					const data2 = splitAtDelimiters(jseden, [{left: '£', right: '£', maths:false}]);
					for (let j = 0; j < data2.length; j++) {
						if(data2[j].type == "jseden"){
							parts[j] = {type: "jseden", expression: data2[j].data};
							dependList.push(data2[j].data);
						}else{
							parts[j] = {type: "text", data: data2[j].data};							
						}
					}
					if(span.getAttribute("data-eden-update") == undefined){
						span.setAttribute("data-eden-update",++dependenciesCreated);
					}
					let updateFunction = ()=>{
						let expression = "";
						try{
							for(let j = 0; j < parts.length; j++){
								if(parts[j].type == "jseden"){
									let obs = parts[j].expression;
									let type = checkTokens(obs);
									if(type == TYPE_EXPRESSION){
										obs = "DOCUMENT_EDEN_" + DocumentEden.Utils.simpleHash(parts[j].expression);
									}
									expression = expression + sanitiseResult(root.lookup(obs).value(),"maths");
								}else{
									expression = expression + parts[j].data;
								}
							}
						}catch(ex){
							console.log(ex);
							expression = "Error";
						}
						span.innerText = "$" + expression + "$";
                        // console.error("Need to render math somehow");
						if(Reveal){
							Reveal.renderMath(span);
						}
					}
					if(dependList.length == 0){
						//Maths declared with €€ but with no ££
						updateFunction();
					}
					// if(span.getAttribute("data-eden-update") == 45){
					// 	console.log(dependList);
					// 	debugger;
					// }
					dependList.forEach((expr)=>{
						//Might need to change this
						DocumentEden.createDependency(expr,span.getAttribute("data-eden-update"),updateFunction);
					});
				}
            } catch (e) {
                fragment.appendChild(document.createTextNode(data[i].rawData));
            }
            fragment.appendChild(span);
        }
    }

    return fragment;
};

DocumentEden.Utils.isNumeric = function (str) {
	if (typeof str != "string") return false // we only process strings!  
	return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
		!isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}


function checkTokens(code) {
	//TODO: Make this more robust by actually doing full lex process based on lex.js
	let es = new EdenStream(code);
	let type = es.readToken();
	// if(type != 'OBSERVABLE')
	// 	return TYPE_INVALID;
	let type2 = es.readToken();
	if (type2 == 'EOF')
		return TYPE_OBSERVABLE;
	if (type2 == "=")
		return TYPE_ASSIGNMENT;
	if (type2 == "is")
		return TYPE_DEFINITION;
	return TYPE_EXPRESSION;
}

DocumentEden.Utils.simpleHash = str => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
	}
	// Convert to 32bit unsigned integer in base 36 and pad with "0" to ensure length is 7.
	return (hash >>> 0).toString(36).padStart(7, '0');
};

let dependenciesCreated = 0;

DocumentEden.createDependency = function (code, updateID, jsObserver) {
	return new Promise((resolve, reject) => {
		let sym, obsName;
		if (checkTokens(code) == TYPE_EXPRESSION) {
			let hash = DocumentEden.Utils.simpleHash(code);
			obsName = "DOCUMENT_EDEN_" + hash;
			sym = root.lookup(obsName);
			if (sym.definition === undefined) {
				//The DOCUMENT_EDEN_hash symbol has never been defined before, so create it
				code = obsName + " is " + code;
				let f = new Eden.Fragment("f" + hash, () => {
					f.setSourceInitial(code);
					f.ast.execute(EdenSymbol.defaultAgent, root.scope, () => {
						let curVal = root.lookup(obsName).value();
						root.lookup(obsName).addJSObserver(obsName + "_update" + updateID, jsObserver);
						jsObserver(obsName, curVal);
						resolve(obsName);
					});
				});
				return;
			}
		} else {
			obsName = code;
			sym = root.lookup(obsName);
		}
		//This symbol has been defined before (or it's a single name observable, with or without a definition)
		//so use existing symbol and add another observer
		sym.addJSObserver(obsName + "_update" + updateID, jsObserver);
		let curVal = root.lookup(obsName).value();
		jsObserver(obsName, curVal);
		resolve(obsName);
	});
}

DocumentEden.getDefinition = function (sym) {
	let s = root.lookup(sym);
	if(s.origin !== undefined)
		return [s.origin.type, s.origin.source, s.value()];
	return [undefined, undefined, s.value()];
}

window.DocumentEden = DocumentEden;
window.checkTokens = checkTokens;
window.root = root;
window.eden = eden;

window.edenProjectLoadedResolve;
window.edenProjectLoaded = new Promise((resolve) => { window.edenProjectLoadedResolve = resolve });
window.edenProjectLoaded.then(() => {
	DocumentEden.refreshElement();
})

DocumentEden.saveState = function () {
	let src = eden.project.ast.scripts.ACTIVE.getSource();
	var lines = src.split('\n');
	lines.splice(0, 1);
	lines.splice(-1);
	let newlines = lines.filter((str) => { return !(str.startsWith("jseden_") || str.startsWith("view") || str.startsWith("background_")); })
	return newlines.join('\n');
}

DocumentEden.loadState = function (src, stateID) {
	let f = new Eden.Fragment("loadState" + stateID, () => {
		f.setSourceInitial(src);
		f.ast.execute(EdenSymbol.defaultAgent, root.scope, () => { });
	});
}

DocumentEden.simpleLookup = function (s) {
	Eden.Selectors.query(s, undefined, { minimum: 1, options: { external: true } }, (res) => {
		console.log(res);
	})
}

DocumentEden.callJSFunction = function(context,scope){
	try{
		let result;
		let jsFunctionName = context.lookup("jsName").value(scope);
		try{
		result = jsFunctions[jsFunctionName](context.lookup("params").value(scope));
		}catch(ex){
			console.error(ex);
		}
		if(typeof result === 'object' && typeof result.then === 'function'){
		let currentObs = [];
		for(let i = 0; i < context.currentObservables.length; i++){
			currentObs.push(context.currentObservables[i]);
		}
		result.then((v)=>{
			for(let i = 0; i < currentObs.length; i++){
			const thisObs = currentObs[i];
			thisObs.cache.value = v;
			thisObs.cache.up_to_date = true;
			thisObs.expireSubscribers();
			thisObs.fireJSObservers();
			}
		});
		}else{
			return result;
		}
	}catch(ex){
		console.error(ex);
	}
}

window.DocumentEden = DocumentEden;