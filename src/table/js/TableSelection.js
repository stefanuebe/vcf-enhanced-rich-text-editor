import TableToolbar from './TableToolbar.js';
import { hiddenBorderClassName } from './TableTrick.js';

class TableSelection {
  static focusedCell = null;
  static isMouseDown = false;
  static selectionStartElement = null;
  static selectionEndElement = null;
  static previousSelection = [];

  static dblClickTimeout = null;
  static clickedCellTimeout = null;
  static preventMouseDown = true;
  static cellSelectionOnClick = true;

  static mouseDown(quill, e, inCellSelectionOnClick) {
    if (inCellSelectionOnClick !== undefined) { // we may have no options set for onClick
      TableSelection.cellSelectionOnClick = inCellSelectionOnClick;
    }

    if (e.which !== 1 || (quill.container.classList.contains('ql-bubble') && TableSelection.isInsideToolbar(e))) {
      // do nothing with center or right click
      return;
    }
    
    // reset cell selection, even if it is cursor click, keeps everyone in check
    TableSelection.previousSelection = [TableSelection.selectionStartElement, TableSelection.selectionEndElement];
    TableSelection.selectionStartElement = TableSelection.selectionEndElement = null;
    TableSelection.resetSelection();

    if ((!TableSelection.cellSelectionOnClick && (e.ctrlKey || e.metaKey)) || TableSelection.cellSelectionOnClick) {
      TableSelection.isMouseDown = true;

      const targetCell = TableSelection.getTargetCell(e);
      if (!targetCell) {
        // default mouse down event when clicking outside a cell
        TableSelection.focusedCell = null;
        return;
      }
  
      if ((!TableSelection.preventMouseDown && targetCell === TableSelection.clickedCellTimeout) || TableSelection.focusedCell === targetCell) {
        // default mouse down event when multiple click in less than 500ms in the same cell or if the cell is already focused
        TableSelection.focusedCell = targetCell;
        return;
      }
  
      // single mouse left click = start selection
      e.preventDefault();
      TableSelection.focusedCell = null;
  
      clearTimeout(TableSelection.dblClickTimeout);
      TableSelection.dblClickTimeout = setTimeout(() => {
        TableSelection.preventMouseDown = true;
        TableSelection.clickedCellTimeout = null;
      }, 500);
      TableSelection.preventMouseDown = false;
  
      TableSelection.selectionStartElement = TableSelection.clickedCellTimeout = targetCell;
  
      if (TableSelection.selectionStartElement) {
        TableSelection.selectionStartElement.classList.add('ql-cell-selected');
      }
    }
  }

  static mouseMove(quill, e) {
    if (TableSelection.isMouseDown && TableSelection.selectionStartElement) {
      const previousSelectionEndElement = TableSelection.selectionEndElement;
      TableSelection.selectionEndElement = TableSelection.getTargetCell(e);
      // Update selection if: mouse button is down, selection changed, start and end element exist and are in the same table
      if (
        TableSelection.selectionEndElement &&
        TableSelection.selectionEndElement !== previousSelectionEndElement &&
        TableSelection.selectionStartElement.closest('table') === TableSelection.selectionEndElement.closest('table')
      ) {
        TableSelection.resetSelection();

        // set new selection
        const coords = TableSelection.getSelectionCoords();
        for (let y = coords.minY; y <= coords.maxY; y++) {
          for (let x = coords.minX; x <= coords.maxX; x++) {
            let cell = TableSelection.getCellAt(x, y);
            if (cell) {
              cell.classList.add('ql-cell-selected');
            }
          }
        }
      }
    }
  }

  static mouseUp(quill, e) {
    TableSelection.isMouseDown = false;
    if (!TableSelection.selectionEndElement) {
      TableSelection.selectionEndElement = TableSelection.selectionStartElement;
    }

    if (
      TableSelection.previousSelection[0] !== TableSelection.selectionStartElement &&
      TableSelection.previousSelection[1] !== TableSelection.selectionEndElement
    ) {
      TableSelection.selectionChange(quill);
    }
  }

  static selectionChange(quill, range = null, oldRange = null) {
    let isInTable = false;
    if (TableSelection.selectionStartElement || TableSelection.selectionEndElement) {
      // there is a table selection
      isInTable = true;
      TableToolbar.enable(quill, ['split-cell', 'merge-selection', 'remove-selection', TableSelection.selectionStartElement.closest('table').classList.contains(hiddenBorderClassName)?'show-border':'hide-border'] );
      //disable selection based on hidden class
      TableToolbar.disable(quill, !TableSelection.selectionStartElement.closest('table').classList.contains(hiddenBorderClassName)?'show-border':'hide-border'); 
    } else {
      // Text selection
      TableToolbar.disable(quill, ['split-cell', 'merge-selection', 'remove-selection']);
      let selectionStartElement, selectionEndElement;
      if (range === null && oldRange !== null) {
        // There is a previous Quill selection but editor is no longer focused (selection-change event)
        const [startLeaf] = quill.getLeaf(oldRange.index);
        const [endLeaf] = quill.getLeaf(oldRange.index + oldRange.length);
        selectionStartElement = startLeaf.parent.domNode;
        selectionEndElement = endLeaf.parent.domNode;
      } else {
        // No Quill selection, use window.getSelection instead
        const selection = window.getSelection();
        selectionStartElement = selection.anchorNode ? (selection.anchorNode.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode) : null;
        selectionEndElement = selection.focusNode ? (selection.focusNode.nodeType === Node.TEXT_NODE ? selection.focusNode.parentElement : selection.focusNode) : null;
      }

      if (selectionStartElement && selectionEndElement) {
        // there is a text selection
        let closestTable = selectionStartElement.closest('table');
        if (closestTable && closestTable.closest('.ql-editor')) {
          if (selectionEndElement !== selectionStartElement) {
            closestTable = selectionEndElement.closest('table');
            isInTable = closestTable && closestTable.closest('.ql-editor');
          } else {
            isInTable = true;
          }
        }
      } // no selection = not in table
    }

    if (!isInTable && quill.table.isInTable) {
      // disable
      quill.table.isInTable = false;
      TableToolbar.disableAll(quill);
      TableToolbar.enable(quill, ['newtable_*', 'insert', 'undo', 'redo']);
    }

    if (isInTable && !quill.table.isInTable) {
      // enable
      quill.table.isInTable = true;
      TableToolbar.enable(quill, ['append-row*', 'append-col*', 'remove-cell', 'remove-row', 'remove-col', 'remove-table']);
    }

    if (isInTable && quill.table.isInTable){ //we are in a table, are we cursored?
      let cursoredSelection = quill.getSelection();

      if (cursoredSelection) { //we are in table with a cursoredSelection
        const [cursoredElement] = quill.getLine(cursoredSelection.index);
        let cursoredTable = cursoredElement.domNode.closest('table');
        if (cursoredTable){
          TableToolbar.enable(quill, [cursoredTable.classList.contains(hiddenBorderClassName)?'show-border':'hide-border']);
          TableToolbar.disable(quill, [!cursoredTable.classList.contains(hiddenBorderClassName)?'show-border':'hide-border']);   
        }
      }
    }
  }

  static getSelectionCoords() {
    if (TableSelection.selectionStartElement && TableSelection.selectionEndElement) {
      const coords = [
        [
          Array.prototype.indexOf.call(TableSelection.selectionStartElement.parentElement.children, TableSelection.selectionStartElement),
          Array.prototype.indexOf.call(TableSelection.selectionStartElement.parentElement.parentElement.children, TableSelection.selectionStartElement.parentElement)
        ],
        [
          Array.prototype.indexOf.call(TableSelection.selectionEndElement.parentElement.children, TableSelection.selectionEndElement),
          Array.prototype.indexOf.call(TableSelection.selectionEndElement.parentElement.parentElement.children, TableSelection.selectionEndElement.parentElement)
        ]
      ];

      return {
        coords,
        minX: Math.min(coords[0][0], coords[1][0]),
        maxX: Math.max(coords[0][0], coords[1][0]),
        minY: Math.min(coords[0][1], coords[1][1]),
        maxY: Math.max(coords[0][1], coords[1][1])
      };
    }
    return null;
  }

  static getCellAt(x, y) {
    const currentTable = TableSelection.selectionStartElement.closest('table');
    if (currentTable) {
      if (typeof currentTable.children[y] !== 'undefined' && typeof currentTable.children[y].children[x] !== 'undefined') {
        return currentTable.children[y].children[x];
      }
    }
    return null;
  }

  static getTargetCell(e) {
    let element = e.target;
    let cell = null;
    do {
      if (['td', 'th'].includes(element.tagName.toLowerCase())) {
        cell = element;
        break;
      }
      element = element.parentNode;
    } while (element && element !== e.currentTarget);
    return cell;
  }

  static isInsideToolbar(e) {
    return e.target.closest('.ql-toolbar');
  }

  static resetSelection(container) {
    // NOTE: not sure why the container is thrown in here, it was never used before, thus we do not use it neither

    // reset selection for all instances
    // since in the ERTE the quill is inside the shadow root, we cannot access it directly via the document, but the
    // editor only
    document.querySelectorAll("vcf-enhanced-rich-text-editor").forEach(rte => {
      rte._editor.container.querySelectorAll('.ql-editor td.ql-cell-selected').forEach(cell => {
        cell.classList.remove('ql-cell-selected');
      });
    });
  }
}

export default TableSelection;