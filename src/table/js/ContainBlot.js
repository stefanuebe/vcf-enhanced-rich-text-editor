import '../../vendor/vaadin-quill.js';

const Quill = window.Quill;
const Container = Quill.import('blots/container');
const Block = Quill.import('blots/block');
const BlockEmbed = Quill.import('blots/block/embed');
const Parchment = Quill.import('parchment');

class ContainBlot extends Container {
  static create(value) {
    return super.create(value);
  }

  formats(domNode) {
    if (domNode) {
      return domNode.tagName;
    }
    return this.domNode.tagName;
  }
}

ContainBlot.blotName = 'contain';
ContainBlot.tagName = 'contain';
ContainBlot.scope = Parchment.Scope.BLOCK_BLOT;
ContainBlot.defaultChild = 'block';
ContainBlot.allowedChildren = [Block, BlockEmbed, Container];

export default ContainBlot;