mqUtil = {
  mqCmdId: 'mathquill-command-id',
  mqBlockId: 'mathquill-block-id',

  semanticNodeFromHTML: function (htmlNode, mathField) {
    //Filter to make sure we're on a usable mathquill node
    let jqTarget = $(htmlNode);
    let id = -1;
    if (jqTarget.attr(mqUtil.mqBlockId)) {
      id = jqTarget.attr(mqUtil.mqBlockId);
    } else if (jqTarget.attr(mqUtil.mqCmdId)) {
      id = jqTarget.attr(mqUtil.mqCmdId);
    } else {
      return null;
    }
    let semanticTree = mathField.semanticTree();
    if (!semanticTree) {
      return null;
    }
    let semanticNode = semanticTree.findDisplayNode(id);
    return semanticNode;
  },

  isMqNode: function (htmlNode) {
    return mqUtil.mqNodeFromHTML(htmlNode) != null;
  },

  getClosestApplicationNode: function (semanticNode) {
    if (semanticNode instanceof ApplicationNode) {
      return semanticNode;
    } else if (semanticNode == null) {
      return null;
    }
    return mqUtil.getClosestApplicationNode(semanticNode.parent);
  }
};