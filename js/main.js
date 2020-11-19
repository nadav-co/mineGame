'use strict'

const CELL = 'cell'
const MINE = 'mine'

var gMinesCount = [2, 12, 30]
var gFirstMove
var gLevel = 2
var gMines = []
var gBoards = []
var gGameOn
var gBoard
var gTimerInterval
var gStartTime
var gFlagCount
var glives
var gHints
var gIsHint


//make hints
//best score
//safe click
//recorsive expend

function init() {
    gGameOn = false
    clearInterval(gTimerInterval)
    glives = 3
    renderCounters('lives', '❤️', glives)
    gHints = 3
    renderCounters('hints', '🔎', gHints)
    renderCounters('emoji', '😄', 1)
    gMines = []
    gBoards = []
    gIsHint = false
    gBoard = makeBoard(gLevel)
    gBoards.push(gBoard)
    renderBoard(gLevel)
    gFirstMove = true
    gFlagCount = gMinesCount[gLevel - 1]
    console.log(gFlagCount)
    document.querySelector('.counter').innerHTML = gFlagCount
}

function makeBoard(level = 2) {
    var sizes = [4, 8, 12]
    var size = sizes[level - 1]
    var board = []
    for (var i = 0; i < size; i++) {
        board[i] = []
        for (var j = 0; j < size; j++) {
            board[i][j] = { type: CELL, isFlaged: false, mineNegsCount: 0, isPressed: false, coord: { i, j }, negs: [], mineNum: null }
        }
    }
    return board
}

function addMines(board, level = 2) {
    var minesCount = gMinesCount[level - 1]
    var i = 0
    while (minesCount > 0) {
        var cell = getEmptyCell(board)
        if (cell) {
            cell.type = MINE
            gMines.push(cell.coord)
            cell.mineNum = i
            i++
            minesCount--
        }
    }
    console.log(gMines)
}

function renderBoard(level = 2) {
    var sizes = [4, 8, 12]
    var size = sizes[level - 1]
    var txtHtml = ''
    for (var i = 0; i < size; i++) {
        txtHtml += '<tr>\n'
        for (var j = 0; j < size; j++) {
            var value = gBoard[i][j].ispressed ? gBoard[i][j].mineNegsCount : ''
            if (gBoard[i][j].isFlaged) value = '🏴‍☠️'
            txtHtml += `\t<td class="cell-${i}-${j}" oncontextmenu="cellMarked(event)" onclick="cellClicked(this)">${value}</td>\n`
        }
        txtHtml += '</tr>\n'
    }
    var elBoard = document.querySelector('.board')
    elBoard.innerHTML = txtHtml
}





function countCellNegs(cell, mat) {
    var count = 0
    var negs = []
    for (var i = cell.coord.i - 1; i <= cell.coord.i + 1; i++) {
        if (i < 0 || i >= mat.length) continue;
        for (var j = cell.coord.j - 1; j <= cell.coord.j + 1; j++) {
            if (j < 0 || j >= mat[i].length) continue;
            if (i === cell.coord.i && j === cell.coord.j) continue;
            negs.push({ i, j })
            if (mat[i][j].type === MINE) count++
        }
    }
    cell.mineNegsCount = count
    cell.negs = negs
}

function countBoardNegs(board) {
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board.length; j++) {
            countCellNegs(board[i][j], board)
        }
    }
}

function cellClicked(elCell) {
    //prevent playing while game over
    if (!gGameOn && !gFirstMove) return
    console.log(gTimerInterval)

    //firt move actions
    if (gFirstMove) {
        gGameOn = true
        gStartTime = new Date
        gTimerInterval = setInterval(timer, 80)
        addMines(gBoard, gLevel)
        countBoardNegs(gBoard)
    }

    //get cell and check if valid
    var cellClass = elCell.classList[0]
    var coord = getCoorByClass(cellClass)
    var cell = gBoard[coord.i][coord.j]

    //when hunt is on
    if (gIsHint) {
        console.log(cell)
        var cells = cell.negs
        cells.push(cell)
        for (var i = 0; i < cells.length; i++) {
            renderCell(cells[i], cells[i.type])
        }

    }

    if (cell.isFlaged) return

    //mine handel
    if (cell.type === MINE) {
        glives--
        renderCounters('lives', '❤️', glives)
        if (glives > 0) return
        gameOver(false, cell)
        return
    }

    //updating pressed cell
    cell.isPressed = true
    elCell.classList.add('pressed')
    var value = (cell.mineNegsCount) ? cell.mineNegsCount : ''
    renderCell(coord, value)

    //handle negs
    if (!value) {
        for (var idx = 0; idx < cell.negs.length; idx++) {
            var negCoord = cell.negs[idx]
            var neg = gBoard[negCoord.i][negCoord.j]
            if (neg.isFlaged) continue
            if (neg.type !== MINE) {
                var elNeg = document.querySelector(getClassByCoord(negCoord))
                if (neg.mineNegsCount) {
                    neg.isPressed = true
                    elNeg.classList.add('pressed')
                    renderCell(negCoord, neg.mineNegsCount)
                } else {
                    //cellClicked(elNeg) code below is temporary
                    neg.isPressed = true
                    elNeg.classList.add('pressed')
                    renderCell(negCoord, '')
                }
            }
        }
    }
    checkIfWin()

    gBoards.push(gBoard)
    if (gFirstMove) gFirstMove = !gFirstMove


}

function cellMarked(ev) {
    if (!gGameOn && !gFirstMove) return
    ev.preventDefault();
    var elCell = ev.target
    var cellClass = elCell.classList[0]
    var coord = getCoorByClass(cellClass)
    var cell = gBoard[coord.i][coord.j]
    if (cell.isPressed) return
    if (!gFlagCount && !cell.isFlaged) return
    gFlagCount = cell.isFlaged ? gFlagCount + 1 : gFlagCount - 1
    cell.isFlaged = !cell.isFlaged
    var value = cell.isFlaged ? '🏴‍☠' : ''
    renderCell(cell.coord, value)
    checkIfWin()

    gBoards.push(gBoard)
    document.querySelector('.counter').innerHTML = gFlagCount

}

function getHint() {
    gIsHint = !gIsHint
    renderCounters('hints', '🔎nbsp&nbsp&nbsp🔎&nbsp&nbsp&nbsp💡', 1)
}

function checkIfWin() {
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard.length; j++) {
            var cell = gBoard[i][j]
            if (!cell.isPressed && cell.type !== MINE || cell.type === MINE && !cell.isFlaged) return
        }
    }
    gameOver(true, null)
}

function gameOver(win, mineCell) {
    clearInterval(gTimerInterval)
    if (win) {
        //modal
        renderCounters('emoji', '🥳', 1)
        var elModal = document.querySelector('.win')
        console.log('you wonnnn')
    } else {
        // modals
        renderCounters('emoji', '😢', 1)
        var elCell = document.querySelector(getClassByCoord(mineCell.coord))
        elCell.innerHTML = '💣'
        elCell.classList.add('red')
        for (var i = 0; i < gMines.length; i++) {
            renderCell(gMines[i], '💣')
        }
        var elModal = document.querySelector('.loss')

    }
    gGameOn = false
    elModal.style.display = 'block'
    setTimeout(function() { elModal.style.display = 'none' }, 1500, [elModal])
        // play agin


}

function getCoorByClass(cellClass) {
    cellClass = cellClass.split('-')
    return { i: cellClass[1], j: cellClass[2] }
}

function getClassByCoord(coor) {
    if (coor) {
        var i = coor.i
        var j = coor.j
        var cellClass = '.cell-' + i + '-' + j
        return cellClass
    }
}

function timer() {
    var timeNow = new Date
    var time = (timeNow - gStartTime) / 1000
    var elTimer = document.querySelector('.timer')
    elTimer.innerHTML = time.toFixed(3)
}

function renderCell(location, value) {
    var elCell = document.querySelector(`.cell-${location.i}-${location.j}`);
    elCell.innerHTML = value;
}

function renderCounters(counterClass, value, num) {
    var txt = '&nbsp&nbsp&nbsp'
    while (num > 0) {
        txt += value + '&nbsp&nbsp&nbsp'
        num--
    }
    document.querySelector('.' + counterClass).innerHTML = txt

}

function getEmptyCell(board) {
    var emptyCells = []
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[i].length; j++) {
            var cell = board[i][j]
            if (cell.type === CELL && !cell.isFlaged && !cell.isPressed) emptyCells.push(board[i][j])
        }
    }
    i = getRandomInt(emptyCells.length)
    var cell = emptyCells.splice(i, 1)[0]
    return cell

}

function getRandomInt(max, min = 0) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}