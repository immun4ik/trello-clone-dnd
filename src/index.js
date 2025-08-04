import './styles/style.scss'; 

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const initialState = {
    columns: [
        { id: 'column-1', title: 'TODO', cards: [] },
        { id: 'column-2', title: 'In Progress', cards: [] },
        { id: 'column-3', title: 'Done', cards: [] },
    ],
};

let appState = loadState();

function loadState() {
    try {
        const serializedState = localStorage.getItem('trello-board-state');
        if (serializedState === null) {
            return initialState;
        }
        return JSON.parse(serializedState);
    } catch (error) {
        console.error("Error loading state from LocalStorage:", error);
        return initialState;
    }
}

function saveState() {
    try {
        const serializedState = JSON.stringify(appState);
        localStorage.setItem('trello-board-state', serializedState);
    } catch (error) {
        console.error("Error saving state to LocalStorage:", error);
    }
}

const trelloBoard = document.getElementById('trello-board');

function createCardElement(card, columnId) {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card');
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.columnId = columnId;
    cardEl.setAttribute('draggable', 'true'); 
    cardEl.textContent = card.content;

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('card-delete-btn');
    deleteBtn.innerHTML = '&times;';
    deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation(); 
        deleteCard(card.id, columnId);
    });
    cardEl.append(deleteBtn); 

    return cardEl;
}

function createColumnElement(column) {
    const columnEl = document.createElement('div');
    columnEl.classList.add('column');
    columnEl.dataset.columnId = column.id;

    const header = document.createElement('div');
    header.classList.add('column-header');
    header.textContent = column.title;
    columnEl.append(header);

    const cardsList = document.createElement('div');
    cardsList.classList.add('cards-list');
    cardsList.dataset.columnId = column.id; 
    columnEl.append(cardsList);

    column.cards.forEach(card => {
        cardsList.append(createCardElement(card, column.id));
    });

    const addCardBtn = document.createElement('button');
    addCardBtn.classList.add('add-card-btn');
    addCardBtn.textContent = 'Add another card';
    addCardBtn.addEventListener('click', () => showAddCardForm(column.id, addCardBtn));
    columnEl.append(addCardBtn);

    return columnEl;
}

function showAddCardForm(columnId, addBtn) {
    const columnEl = addBtn.closest('.column');
    addBtn.style.display = 'none'; 

    const form = document.createElement('div');
    form.classList.add('add-card-form');

    const textarea = document.createElement('textarea');
    textarea.classList.add('add-card-textarea');
    textarea.placeholder = 'Enter a title for this card...';
    textarea.rows = 3;
    form.append(textarea);

    const controls = document.createElement('div');
    controls.classList.add('add-card-controls');

    const submitBtn = document.createElement('button');
    submitBtn.classList.add('submit-card-btn');
    submitBtn.textContent = 'Add Card';
    submitBtn.addEventListener('click', () => {
        const content = textarea.value.trim();
        if (content) {
            addCard(content, columnId);
        }
        hideAddCardForm(columnId, form, addBtn);
    });
    controls.append(submitBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.classList.add('cancel-card-btn');
    cancelBtn.innerHTML = '&times;';
    cancelBtn.addEventListener('click', () => hideAddCardForm(columnId, form, addBtn));
    controls.append(cancelBtn);

    form.append(controls);
    columnEl.append(form);
    textarea.focus(); 
}

function hideAddCardForm(columnId, form, addBtn) {
    form.remove();
    addBtn.style.display = 'block'; 
}

function renderBoard() {
    trelloBoard.innerHTML = '';
    appState.columns.forEach(column => {
        trelloBoard.append(createColumnElement(column)); 
    });
    saveState(); 
}

function addCard(content, columnId) {
    const newCard = {
        id: uuidv4(),
        content: content,
    };
    const column = appState.columns.find(col => col.id === columnId);
    if (column) {
        column.cards.push(newCard);
    }
    renderBoard();
}

function deleteCard(cardId, columnId) {
    const column = appState.columns.find(col => col.id === columnId);
    if (column) {
        column.cards = column.cards.filter(card => card.id !== cardId);
    }
    renderBoard();
}

let draggedCardEl = null;
let currentPlaceholder = null;
let originalColumnId = null;
let originalCardIndex = -1;

function getColumnElement(columnId) {
    return trelloBoard.querySelector(`.column[data - column - id= "${columnId}"]`);
}

function getCardElement(cardId) {
    return trelloBoard.querySelector(`.card[data - card - id= "${cardId}"]`);
}


trelloBoard.addEventListener('dragstart', (event) => {
    const target = event.target.closest('.card');
    if (target && target.classList.contains('card')) {
        draggedCardEl = target;
        originalColumnId = draggedCardEl.dataset.columnId;
        const column = appState.columns.find(col => col.id === originalColumnId);
        originalCardIndex = column.cards.findIndex(card => card.id === draggedCardEl.dataset.cardId);

        setTimeout(() => {
            draggedCardEl.classList.add('dragging');
        }, 0); 

        event.dataTransfer.setData('text/plain', JSON.stringify({
            cardId: draggedCardEl.dataset.cardId,
            originalColumnId: originalColumnId,
            originalCardIndex: originalCardIndex
        }));
        event.dataTransfer.effectAllowed = 'move';

        document.body.classList.add('grabbing');

        currentPlaceholder = document.createElement('div');
        currentPlaceholder.classList.add('card-placeholder');
        currentPlaceholder.style.setProperty('--placeholder-height', `${draggedCardEl.offsetHeight }px`);
        draggedCardEl.after(currentPlaceholder);

    } else {
        event.preventDefault(); 
    }
});

trelloBoard.addEventListener('dragover', (event) => {
    event.preventDefault(); 
    event.dataTransfer.dropEffect = 'move';

    if (!draggedCardEl || !currentPlaceholder) return;

    const target = event.target.closest('.card, .column');
    let targetColumnEl = null;
    let targetCardsListEl = null;
    let targetCardEl = null;

    if (target) {
        if (target.classList.contains('card')) {
            targetCardEl = target;
            targetColumnEl = target.closest('.column');
            targetCardsListEl = targetColumnEl.querySelector('.cards-list');
        } else if (target.classList.contains('column')) {
            targetColumnEl = target;
            targetCardsListEl = target.querySelector('.cards-list');
        }
    }

    if (targetColumnEl && targetCardsListEl) {
        if (currentPlaceholder.parentNode && currentPlaceholder.parentNode !== targetCardsListEl) {
            currentPlaceholder.remove();
            targetCardsListEl.append(currentPlaceholder); 
        } else if (!currentPlaceholder.parentNode) { 
            targetCardsListEl.append(currentPlaceholder);
        }

        const cardsInTargetList = Array.from(targetCardsListEl.children).filter(el => el.classList.contains('card') && el !== draggedCardEl);

        if (cardsInTargetList.length === 0) {
            if (targetCardsListEl.lastChild !== currentPlaceholder) {
                targetCardsListEl.append(currentPlaceholder);
            }
        } else if (targetCardEl && targetCardEl !== draggedCardEl) {
            const rect = targetCardEl.getBoundingClientRect();
            const center = rect.top + rect.height / 2;

            if (event.clientY < center) {
                if (targetCardEl.previousSibling !== currentPlaceholder) {
                    targetCardsListEl.insertBefore(currentPlaceholder, targetCardEl);
                }
            } else {
                if (targetCardEl.nextSibling !== currentPlaceholder) {
                    targetCardsListEl.insertBefore(currentPlaceholder, targetCardEl.nextSibling);
                }
            }
        } else if (!targetCardEl && targetCardsListEl && event.target.closest('.column') === targetColumnEl) {
          
            if (cardsInTargetList.length > 0 && targetCardsListEl.lastChild !== currentPlaceholder) {
                targetCardsListEl.append(currentPlaceholder);
            }
        }
    } else {
        if (currentPlaceholder && currentPlaceholder.parentNode) {
            currentPlaceholder.remove();
        }
    }
});


trelloBoard.addEventListener('drop', (event) => {
    event.preventDefault();

    if (!draggedCardEl || !currentPlaceholder) return;

    const sourceColumnId = originalColumnId;
    const sourceCardId = draggedCardEl.dataset.cardId;

    const targetCardsList = currentPlaceholder.parentNode;
    if (!targetCardsList || !targetCardsList.classList.contains('cards-list')) {
        renderBoard(); 
        return;
    }

    const targetColumnId = targetCardsList.dataset.columnId;
    const allCardsInTargetList = Array.from(targetCardsList.children).filter(el => el.classList.contains('card'));
    let newIndex = allCardsInTargetList.indexOf(draggedCardEl); 

    let placeholderIndex = Array.from(targetCardsList.children).indexOf(currentPlaceholder);
    if (placeholderIndex === -1) { 
        newIndex = targetCardsList.children.length;
    } else {
        newIndex = placeholderIndex;
    }

    const sourceColumn = appState.columns.find(col => col.id === sourceColumnId);
    const draggedCard = sourceColumn.cards.find(card => card.id === sourceCardId);
    sourceColumn.cards = sourceColumn.cards.filter(card => card.id !== sourceCardId);

    const targetColumn = appState.columns.find(col => col.id === targetColumnId);
    if (newIndex >= 0 && newIndex <= targetColumn.cards.length) {
        targetColumn.cards.splice(newIndex, 0, draggedCard);
    } else {
        targetColumn.cards.push(draggedCard); 
    }

    renderBoard(); 
});

trelloBoard.addEventListener('dragend', () => {
    if (draggedCardEl) {
        draggedCardEl.classList.remove('dragging');
        draggedCardEl.style.opacity = ''; 
    }
    if (currentPlaceholder) {
        currentPlaceholder.remove();
    }
    document.body.classList.remove('grabbing');
    draggedCardEl = null;
    currentPlaceholder = null;
    originalColumnId = null;
    originalCardIndex = -1;
});

document.addEventListener('DOMContentLoaded', renderBoard);