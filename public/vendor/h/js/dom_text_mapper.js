(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __slice = [].slice,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  window.DomTextMapper = (function() {
    var CONTEXT_LEN, SELECT_CHILDREN_INSTEAD, USE_EMPTY_TEXT_WORKAROUND, USE_TABLE_TEXT_WORKAROUND, WHITESPACE;

    DomTextMapper.applicable = function() {
      return true;
    };

    USE_TABLE_TEXT_WORKAROUND = true;

    USE_EMPTY_TEXT_WORKAROUND = true;

    SELECT_CHILDREN_INSTEAD = ["thead", "tbody", "ol", "a", "caption", "p", "span", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "li", "form"];

    CONTEXT_LEN = 32;

    DomTextMapper.instances = 0;

    function DomTextMapper(id) {
      this.id = id;
      this._onChange = __bind(this._onChange, this);
      this.setRealRoot();
      DomTextMapper.instances += 1;
      if (this.id == null) {
        this.id = "d-t-m #" + DomTextMapper.instances;
      }
    }

    DomTextMapper.prototype.log = function() {
      var msg;
      msg = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return console.log.apply(console, [this.id, ": "].concat(__slice.call(msg)));
    };

    DomTextMapper.prototype._onChange = function(event) {
      this.documentChanged();
      this.performUpdateOnNode(event.srcElement, false, event.data);
      return this.lastScanned = this.timestamp();
    };

    DomTextMapper.prototype._changeRootNode = function(node) {
      var _ref;
      if ((_ref = this.rootNode) != null) {
        _ref.removeEventListener("domChange", this._onChange);
      }
      this.rootNode = node;
      this.rootNode.addEventListener("domChange", this._onChange);
      return node;
    };

    DomTextMapper.prototype.setRootNode = function(rootNode) {
      this.rootWin = window;
      return this.pathStartNode = this._changeRootNode(rootNode);
    };

    DomTextMapper.prototype.setRootId = function(rootId) {
      return this.setRootNode(document.getElementById(rootId));
    };

    DomTextMapper.prototype.setRootIframe = function(iframeId) {
      var iframe;
      iframe = window.document.getElementById(iframeId);
      if (iframe == null) {
        throw new Error("Can't find iframe with specified ID!");
      }
      this.rootWin = iframe.contentWindow;
      if (this.rootWin == null) {
        throw new Error("Can't access contents of the specified iframe!");
      }
      this._changeRootNode(this.rootWin.document);
      return this.pathStartNode = this.getBody();
    };

    DomTextMapper.prototype.getDefaultPath = function() {
      return this.getPathTo(this.pathStartNode);
    };

    DomTextMapper.prototype.setRealRoot = function() {
      this.rootWin = window;
      this._changeRootNode(document);
      return this.pathStartNode = this.getBody();
    };

    DomTextMapper.prototype.documentChanged = function() {
      return this.lastDOMChange = this.timestamp();
    };

    DomTextMapper.prototype.setExpectedContent = function(content) {
      return this.expectedContent = content;
    };

    DomTextMapper.prototype.scan = function() {
      var node, path, startTime, t1, t2;
      if (this.domStableSince(this.lastScanned)) {
        return;
      } else {

      }
      if (!this.pathStartNode.ownerDocument.body.contains(this.pathStartNode)) {
        return;
      }
      startTime = this.timestamp();
      this.saveSelection();
      this.path = {};
      this.traverseSubTree(this.pathStartNode, this.getDefaultPath());
      t1 = this.timestamp();
      path = this.getPathTo(this.pathStartNode);
      node = this.path[path].node;
      this.collectPositions(node, path, null, 0, 0);
      this.restoreSelection();
      this.lastScanned = this.timestamp();
      this._corpus = this.path[path].content;
      t2 = this.timestamp();
      return null;
    };

    DomTextMapper.prototype.selectPath = function(path, scroll) {
      var info, node;
      if (scroll == null) {
        scroll = false;
      }
      info = this.path[path];
      if (info == null) {
        throw new Error("I have no info about a node at " + path);
      }
      node = info != null ? info.node : void 0;
      node || (node = this.lookUpNode(info.path));
      return this.selectNode(node, scroll);
    };

    DomTextMapper.prototype.performUpdateOnNode = function(node, escalating) {
      var data, oldIndex, p, parentNode, parentPath, parentPathInfo, path, pathInfo, pathsToDrop, prefix, startTime, _i, _len, _ref;
      if (escalating == null) {
        escalating = false;
      }
      if (node == null) {
        throw new Error("Called performUpdate with a null node!");
      }
      if (this.path == null) {
        return;
      }
      startTime = this.timestamp();
      if (!escalating) {
        this.saveSelection();
      }
      path = this.getPathTo(node);
      pathInfo = this.path[path];
      if (pathInfo == null) {
        this.performUpdateOnNode(node.parentNode, true);
        if (!escalating) {
          this.restoreSelection();
        }
        return;
      }
      if (pathInfo.node === node && pathInfo.content === this.getNodeContent(node, false)) {
        prefix = path + "/";
        pathsToDrop = p;
        pathsToDrop = [];
        _ref = this.path;
        for (p in _ref) {
          data = _ref[p];
          if (this.stringStartsWith(p, prefix)) {
            pathsToDrop.push(p);
          }
        }
        for (_i = 0, _len = pathsToDrop.length; _i < _len; _i++) {
          p = pathsToDrop[_i];
          delete this.path[p];
        }
        this.traverseSubTree(node, path);
        if (pathInfo.node === this.pathStartNode) {
          this.collectPositions(node, path, null, 0, 0);
        } else {
          parentPath = this.parentPath(path);
          parentPathInfo = this.path[parentPath];
          if (parentPathInfo == null) {
            throw new Error("While performing update on node " + path + ", no path info found for parent path: " + parentPath);
          }
          oldIndex = node === node.parentNode.firstChild ? 0 : this.path[this.getPathTo(node.previousSibling)].end - parentPathInfo.start;
          this.collectPositions(node, path, parentPathInfo.content, parentPathInfo.start, oldIndex);
        }
      } else {
        if (pathInfo.node !== this.pathStartNode) {
          parentNode = node.parentNode != null ? node.parentNode : (parentPath = this.parentPath(path), this.lookUpNode(parentPath));
          this.performUpdateOnNode(parentNode, true);
        } else {
          throw new Error("Can not keep up with the changes, since even the node configured as path start node was replaced.");
        }
      }
      if (!escalating) {
        return this.restoreSelection();
      }
    };

    DomTextMapper.prototype.getInfoForPath = function(path) {
      var result;
      if (this.path == null) {
        throw new Error("Can't get info before running a scan() !");
      }
      result = this.path[path];
      if (result == null) {
        throw new Error("Found no info for path '" + path + "'!");
      }
      return result;
    };

    DomTextMapper.prototype.getInfoForNode = function(node) {
      if (node == null) {
        throw new Error("Called getInfoForNode(node) with null node!");
      }
      return this.getInfoForPath(this.getPathTo(node));
    };

    DomTextMapper.prototype.getMappingsForCharRanges = function(charRanges) {
      var charRange, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = charRanges.length; _i < _len; _i++) {
        charRange = charRanges[_i];
        _results.push(this.getMappingsForCharRange(charRange.start, charRange.end));
      }
      return _results;
    };

    DomTextMapper.prototype.getContentForPath = function(path) {
      if (path == null) {
        path = null;
      }
      if (path == null) {
        path = this.getDefaultPath();
      }
      return this.path[path].content;
    };

    DomTextMapper.prototype.getLengthForPath = function(path) {
      if (path == null) {
        path = null;
      }
      if (path == null) {
        path = this.getDefaultPath();
      }
      return this.path[path].length;
    };

    DomTextMapper.prototype.getDocLength = function() {
      return this._corpus.length;
    };

    DomTextMapper.prototype.getCorpus = function() {
      return this._corpus;
    };

    DomTextMapper.prototype.getContextForCharRange = function(start, end) {
      var prefix, prefixStart, suffix;
      prefixStart = Math.max(0, start - CONTEXT_LEN);
      prefix = this._corpus.slice(prefixStart, +(start - 1) + 1 || 9e9);
      suffix = this._corpus.slice(end, +(end + CONTEXT_LEN - 1) + 1 || 9e9);
      return [prefix.trim(), suffix.trim()];
    };

    DomTextMapper.prototype.getMappingsForCharRange = function(start, end) {
      var endInfo, endMapping, endNode, endOffset, endPath, info, mappings, p, r, result, startInfo, startMapping, startNode, startOffset, startPath, _ref,
        _this = this;
      if (!((start != null) && (end != null))) {
        throw new Error("start and end is required!");
      }
      this.scan();
      mappings = [];
      _ref = this.path;
      for (p in _ref) {
        info = _ref[p];
        if (info.atomic && this.regions_overlap(info.start, info.end, start, end)) {
          (function(info) {
            var full, mapping;
            mapping = {
              element: info
            };
            full = start <= info.start && info.end <= end;
            if (full) {
              mapping.full = true;
              mapping.wanted = info.content;
              mapping.yields = info.content;
              mapping.startCorrected = 0;
              mapping.endCorrected = 0;
            } else {
              if (info.node.nodeType === Node.TEXT_NODE) {
                if (start <= info.start) {
                  mapping.end = end - info.start;
                  mapping.wanted = info.content.substr(0, mapping.end);
                } else if (info.end <= end) {
                  mapping.start = start - info.start;
                  mapping.wanted = info.content.substr(mapping.start);
                } else {
                  mapping.start = start - info.start;
                  mapping.end = end - info.start;
                  mapping.wanted = info.content.substr(mapping.start, mapping.end - mapping.start);
                }
                _this.computeSourcePositions(mapping);
                mapping.yields = info.node.data.substr(mapping.startCorrected, mapping.endCorrected - mapping.startCorrected);
              } else if ((info.node.nodeType === Node.ELEMENT_NODE) && (info.node.tagName.toLowerCase() === "img")) {
                _this.log("Can not select a sub-string from the title of an image. Selecting all.");
                mapping.full = true;
                mapping.wanted = info.content;
              } else {
                _this.log("Warning: no idea how to handle partial mappings for node type " + info.node.nodeType);
                if (info.node.tagName != null) {
                  _this.log("Tag: " + info.node.tagName);
                }
                _this.log("Selecting all.");
                mapping.full = true;
                mapping.wanted = info.content;
              }
            }
            return mappings.push(mapping);
          })(info);
        }
      }
      if (mappings.length === 0) {
        this.log("Collecting nodes for [" + start + ":" + end + "]");
        this.log("Should be: '" + this._corpus.slice(start, +(end - 1) + 1 || 9e9) + "'.");
        throw new Error("No mappings found for [" + start + ":" + end + "]!");
      }
      mappings = mappings.sort(function(a, b) {
        return a.element.start - b.element.start;
      });
      r = this.rootWin.document.createRange();
      startMapping = mappings[0];
      startNode = startMapping.element.node;
      startPath = startMapping.element.path;
      startOffset = startMapping.startCorrected;
      if (startMapping.full) {
        r.setStartBefore(startNode);
        startInfo = startPath;
      } else {
        r.setStart(startNode, startOffset);
        startInfo = startPath + ":" + startOffset;
      }
      endMapping = mappings[mappings.length - 1];
      endNode = endMapping.element.node;
      endPath = endMapping.element.path;
      endOffset = endMapping.endCorrected;
      if (endMapping.full) {
        r.setEndAfter(endNode);
        endInfo = endPath;
      } else {
        r.setEnd(endNode, endOffset);
        endInfo = endPath + ":" + endOffset;
      }
      result = {
        mappings: mappings,
        realRange: r,
        rangeInfo: {
          startPath: startPath,
          startOffset: startOffset,
          startInfo: startInfo,
          endPath: endPath,
          endOffset: endOffset,
          endInfo: endInfo
        },
        safeParent: r.commonAncestorContainer
      };
      return {
        sections: [result]
      };
    };

    DomTextMapper.prototype.timestamp = function() {
      return new Date().getTime();
    };

    DomTextMapper.prototype.stringStartsWith = function(string, prefix) {
      return string.slice(0, +(prefix.length - 1) + 1 || 9e9) === prefix;
    };

    DomTextMapper.prototype.stringEndsWith = function(string, suffix) {
      return string.slice(string.length - suffix.length, +string.length + 1 || 9e9) === suffix;
    };

    DomTextMapper.prototype.parentPath = function(path) {
      return path.substr(0, path.lastIndexOf("/"));
    };

    DomTextMapper.prototype.domChangedSince = function(timestamp) {
      if ((this.lastDOMChange != null) && (timestamp != null)) {
        return this.lastDOMChange > timestamp;
      } else {
        return true;
      }
    };

    DomTextMapper.prototype.domStableSince = function(timestamp) {
      return !this.domChangedSince(timestamp);
    };

    DomTextMapper.prototype.getProperNodeName = function(node) {
      var nodeName;
      nodeName = node.nodeName;
      switch (nodeName) {
        case "#text":
          return "text()";
        case "#comment":
          return "comment()";
        case "#cdata-section":
          return "cdata-section()";
        default:
          return nodeName;
      }
    };

    DomTextMapper.prototype.getNodePosition = function(node) {
      var pos, tmp;
      pos = 0;
      tmp = node;
      while (tmp) {
        if (tmp.nodeName === node.nodeName) {
          pos++;
        }
        tmp = tmp.previousSibling;
      }
      return pos;
    };

    DomTextMapper.prototype.getPathSegment = function(node) {
      var name, pos;
      name = this.getProperNodeName(node);
      pos = this.getNodePosition(node);
      return name + (pos > 1 ? "[" + pos + "]" : "");
    };

    DomTextMapper.prototype.getPathTo = function(node) {
      var xpath;
      xpath = '';
      while (node !== this.rootNode) {
        if (node == null) {
          throw new Error("Called getPathTo on a node which was not a descendant of @rootNode. " + this.rootNode);
        }
        xpath = (this.getPathSegment(node)) + '/' + xpath;
        node = node.parentNode;
      }
      xpath = (this.rootNode.ownerDocument != null ? './' : '/') + xpath;
      xpath = xpath.replace(/\/$/, '');
      return xpath;
    };

    DomTextMapper.prototype.traverseSubTree = function(node, path, invisible, verbose) {
      var child, cont, subpath, _i, _len, _ref;
      if (invisible == null) {
        invisible = false;
      }
      if (verbose == null) {
        verbose = false;
      }
      this.underTraverse = path;
      cont = this.getNodeContent(node, false);
      this.path[path] = {
        path: path,
        content: cont,
        length: cont.length,
        node: node
      };
      if (cont.length) {
        if (verbose) {
          this.log("Collected info about path " + path);
        }
        if (invisible) {
          this.log("Something seems to be wrong. I see visible content @ " + path + ", while some of the ancestor nodes reported empty contents. Probably a new selection API bug....");
          this.log("Anyway, text is '" + cont + "'.");
        }
      } else {
        if (verbose) {
          this.log("Found no content at path " + path);
        }
        invisible = true;
      }
      if (node.hasChildNodes()) {
        _ref = node.childNodes;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          child = _ref[_i];
          subpath = path + '/' + (this.getPathSegment(child));
          this.traverseSubTree(child, subpath, invisible, verbose);
        }
      }
      return null;
    };

    DomTextMapper.prototype.getBody = function() {
      return (this.rootWin.document.getElementsByTagName("body"))[0];
    };

    DomTextMapper.prototype.regions_overlap = function(start1, end1, start2, end2) {
      return start1 < end2 && start2 < end1;
    };

    DomTextMapper.prototype.lookUpNode = function(path) {
      var doc, node, results, _ref;
      doc = (_ref = this.rootNode.ownerDocument) != null ? _ref : this.rootNode;
      results = doc.evaluate(path, this.rootNode, null, 0, null);
      return node = results.iterateNext();
    };

    DomTextMapper.prototype.saveSelection = function() {
      var exception, i, sel, _i, _ref;
      if (this.savedSelection != null) {
        this.log("Selection saved at:");
        this.log(this.selectionSaved);
        throw new Error("Selection already saved!");
      }
      sel = this.rootWin.getSelection();
      for (i = _i = 0, _ref = sel.rangeCount; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        this.savedSelection = sel.getRangeAt(i);
      }
      switch (sel.rangeCount) {
        case 0:
          if (this.savedSelection == null) {
            this.savedSelection = [];
          }
          break;
        case 1:
          this.savedSelection = [this.savedSelection];
      }
      try {
        throw new Error("Selection was saved here");
      } catch (_error) {
        exception = _error;
        return this.selectionSaved = exception.stack;
      }
    };

    DomTextMapper.prototype.restoreSelection = function() {
      var range, sel, _i, _len, _ref;
      if (this.savedSelection == null) {
        throw new Error("No selection to restore.");
      }
      sel = this.rootWin.getSelection();
      sel.removeAllRanges();
      _ref = this.savedSelection;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        range = _ref[_i];
        sel.addRange(range);
      }
      return delete this.savedSelection;
    };

    DomTextMapper.prototype.selectNode = function(node, scroll) {
      var children, exception, realRange, sel, sn, _ref;
      if (scroll == null) {
        scroll = false;
      }
      if (node == null) {
        throw new Error("Called selectNode with null node!");
      }
      sel = this.rootWin.getSelection();
      sel.removeAllRanges();
      realRange = this.rootWin.document.createRange();
      if (node.nodeType === Node.ELEMENT_NODE && node.hasChildNodes() && (_ref = node.tagName.toLowerCase(), __indexOf.call(SELECT_CHILDREN_INSTEAD, _ref) >= 0)) {
        children = node.childNodes;
        realRange.setStartBefore(children[0]);
        realRange.setEndAfter(children[children.length - 1]);
        sel.addRange(realRange);
      } else {
        if (USE_TABLE_TEXT_WORKAROUND && node.nodeType === Node.TEXT_NODE && node.parentNode.tagName.toLowerCase() === "table") {

        } else {
          try {
            realRange.setStartBefore(node);
            realRange.setEndAfter(node);
            sel.addRange(realRange);
          } catch (_error) {
            exception = _error;
            if (!(USE_EMPTY_TEXT_WORKAROUND && this.isWhitespace(node))) {
              this.log("Warning: failed to scan element @ " + this.underTraverse);
              this.log("Content is: " + node.innerHTML);
              this.log("We won't be able to properly anchor to any text inside this element.");
            }
          }
        }
      }
      if (scroll) {
        sn = node;
        while ((sn != null) && (sn.scrollIntoViewIfNeeded == null)) {
          sn = sn.parentNode;
        }
        if (sn != null) {
          sn.scrollIntoViewIfNeeded();
        } else {
          this.log("Failed to scroll to element. (Browser does not support scrollIntoViewIfNeeded?)");
        }
      }
      return sel;
    };

    DomTextMapper.prototype.readSelectionText = function(sel) {
      sel || (sel = this.rootWin.getSelection());
      return sel.toString().trim().replace(/\n/g, " ").replace(/\s{2,}/g, " ");
    };

    DomTextMapper.prototype.getNodeSelectionText = function(node, shouldRestoreSelection) {
      var sel, text;
      if (shouldRestoreSelection == null) {
        shouldRestoreSelection = true;
      }
      if (shouldRestoreSelection) {
        this.saveSelection();
      }
      sel = this.selectNode(node);
      text = this.readSelectionText(sel);
      if (shouldRestoreSelection) {
        this.restoreSelection();
      }
      return text;
    };

    DomTextMapper.prototype.computeSourcePositions = function(match) {
      var dc, displayEnd, displayIndex, displayStart, displayText, sc, sourceEnd, sourceIndex, sourceStart, sourceText;
      sourceText = match.element.node.data.replace(/\n/g, " ");
      displayText = match.element.content;
      displayStart = match.start != null ? match.start : 0;
      displayEnd = match.end != null ? match.end : displayText.length;
      if (displayEnd === 0) {
        match.startCorrected = 0;
        match.endCorrected = 0;
        return;
      }
      sourceIndex = 0;
      displayIndex = 0;
      while (!((sourceStart != null) && (sourceEnd != null))) {
        sc = sourceText[sourceIndex];
        dc = displayText[displayIndex];
        if (sc === dc) {
          if (displayIndex === displayStart) {
            sourceStart = sourceIndex;
          }
          displayIndex++;
          if (displayIndex === displayEnd) {
            sourceEnd = sourceIndex + 1;
          }
        }
        sourceIndex++;
      }
      match.startCorrected = sourceStart;
      match.endCorrected = sourceEnd;
      return null;
    };

    DomTextMapper.prototype.getNodeContent = function(node, shouldRestoreSelection) {
      if (shouldRestoreSelection == null) {
        shouldRestoreSelection = true;
      }
      if (node === this.pathStartNode && (this.expectedContent != null)) {
        return this.expectedContent;
      } else {
        return this.getNodeSelectionText(node, shouldRestoreSelection);
      }
    };

    DomTextMapper.prototype.collectPositions = function(node, path, parentContent, parentIndex, index) {
      var atomic, child, childPath, children, content, endIndex, i, newCount, nodeName, oldCount, pathInfo, pos, startIndex, typeCount;
      if (parentContent == null) {
        parentContent = null;
      }
      if (parentIndex == null) {
        parentIndex = 0;
      }
      if (index == null) {
        index = 0;
      }
      pathInfo = this.path[path];
      content = pathInfo != null ? pathInfo.content : void 0;
      if ((content == null) || content === "") {
        pathInfo.start = parentIndex + index;
        pathInfo.end = parentIndex + index;
        pathInfo.atomic = false;
        return index;
      }
      startIndex = parentContent != null ? parentContent.indexOf(content, index) : index;
      if (startIndex === -1) {
        this.log("Content of this not is not present in content of parent, at path " + path);
        this.log("(Content: '" + content + "'.)");
        return index;
      }
      endIndex = startIndex + content.length;
      atomic = !node.hasChildNodes();
      pathInfo.start = parentIndex + startIndex;
      pathInfo.end = parentIndex + endIndex;
      pathInfo.atomic = atomic;
      if (!atomic) {
        children = node.childNodes;
        i = 0;
        pos = 0;
        typeCount = Object();
        while (i < children.length) {
          child = children[i];
          nodeName = this.getProperNodeName(child);
          oldCount = typeCount[nodeName];
          newCount = oldCount != null ? oldCount + 1 : 1;
          typeCount[nodeName] = newCount;
          childPath = path + "/" + nodeName + (newCount > 1 ? "[" + newCount + "]" : "");
          pos = this.collectPositions(child, childPath, content, parentIndex + startIndex, pos);
          i++;
        }
      }
      return endIndex;
    };

    WHITESPACE = /^\s*$/;

    DomTextMapper.prototype.isWhitespace = function(node) {
      var child, mightBeEmpty, result;
      result = (function() {
        var _i, _len, _ref;
        switch (node.nodeType) {
          case Node.TEXT_NODE:
            return WHITESPACE.test(node.data);
          case Node.ELEMENT_NODE:
            mightBeEmpty = true;
            _ref = node.childNodes;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              child = _ref[_i];
              mightBeEmpty = mightBeEmpty && this.isWhitespace(child);
            }
            return mightBeEmpty;
          default:
            return false;
        }
      }).call(this);
      return result;
    };

    DomTextMapper.prototype._testMap = function() {
      var expected, i, ok, p, _ref, _ref1;
      this.log("Verifying map info: was it all properly traversed?");
      _ref = this.path;
      for (i in _ref) {
        p = _ref[i];
        if (p.atomic == null) {
          this.log(i + " is missing data.");
        }
      }
      this.log("Verifying map info: do atomic elements match?");
      _ref1 = this.path;
      for (i in _ref1) {
        p = _ref1[i];
        if (!p.atomic) {
          continue;
        }
        expected = this._corpus.slice(p.start, +(p.end - 1) + 1 || 9e9);
        ok = p.content === expected;
        if (!ok) {
          this.log("Mismatch on " + i + ": content is '" + p.content + "', range in corpus is '" + expected + "'.");
        }
        ok;
      }
      return null;
    };

    DomTextMapper.prototype.getPageIndex = function() {
      return 0;
    };

    DomTextMapper.prototype.getPageCount = function() {
      return 1;
    };

    DomTextMapper.prototype.getPageIndexForPos = function() {
      return 0;
    };

    DomTextMapper.prototype.isPageMapped = function() {
      return true;
    };

    return DomTextMapper;

  })();

}).call(this);
