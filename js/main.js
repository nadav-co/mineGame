'use strict'

const CELL = 'cell'
const MINE = 'mine'

var gMinesCount = [2, 12, 30]
var gFirstMove
var gLevel = 2
var gSafeClicks
var gMines = []
var gChanged
var gGameOn
var gBoard
var gTimerInterval
var gStartTime
var gFlagCount
var glives
var gHints
var gIsHint
var gRecCount


//best score

function init() {
    gChanged = []
    gHints = 3
    gSafeClicks = 3
    gGameOn = false
    glives = 3
    clearInterval(gTimerInterval)
    renderCounters('lives', '❤️', glives)
    renderCounters('hints', '🔎', gHints)
    renderCounters('emoji', '😄', 1)
    renderCounters('timer', '0.000', 1)
    gMines = []
    gIsHint = false
    gBoard = makeBoard(gLevel)
    renderBoard(gBoard)
    gFirstMove = true
    gFlagCount = gMinesCount[gLevel - 1]
    document.querySelector('.counter').innerHTML = gFlagCount
    document.querySelector('.safe-click span').innerHTML = '|||'

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
}

function renderBoard(board) {
    var size = board.length
    var txtHtml = ''
    for (var i = 0; i < size; i++) {
        txtHtml += '<tr>\n'
        for (var j = 0; j < size; j++) {
            var cell = board[i][j]
            var value = ''
            var cellClass = ''
            if (cell.isPressed) {
                cellClass = ' pressed'
                if (cell.mineNegsCount > 0) value = cell.mineNegsCount
            }
            if (cell.isFlaged) value = '🏴‍☠️'
            txtHtml += `\t<td class="cell-${i}-${j}${cellClass}" ondblclick="cellMarked(event)" oncontextmenu="cellMarked(event)" onclick="cellClicked(this,true)">${value}</td>\n`
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

function cellClicked(elCell, calledInClick = false) {
    // counting recursion
    if (calledInClick) gRecCount = 0
    gRecCount++
    //prevent playing while game over
    if (!gGameOn && !gFirstMove) return

    //get cell and check if valid
    var cellClass = elCell.classList[0]
    var coord = getCoorByClass(cellClass)
    var cell = gBoard[coord.i][coord.j]

    //firt move actions
    if (gFirstMove) {
        gGameOn = true
        gStartTime = new Date
        gTimerInterval = setInterval(timer, 80)
        cell.isPressed = true
        addMines(gBoard, gLevel)
        countBoardNegs(gBoard)
        gFirstMove = false
    }

    //when hint is on
    if (gIsHint) {
        gHints--
        gIsHint = false
        var cells = cell.negs
        cells.push(cell.coord)
        for (var i = 0; i < cells.length; i++) {
            cell = gBoard[cells[i].i][cells[i].j]
            if (cell.isFlaged || cell.isPressed) continue
            renderCell(cells[i], cell.type === MINE ? '💣' : cell.mineNegsCount, 'red')
        }
        setTimeout(function() {
            for (var i = 0; i < cells.length; i++) {
                cell = gBoard[cells[i].i][cells[i].j]
                if (cell.isFlaged || cell.isPressed) continue
                renderCell(cells[i], '', 'red', true)
            }
        }, 1000)
        renderCounters('hints', '🔎', gHints, '', 3 - gHints)

        return
    }

    if (cell.isFlaged) return

    //mine handel
    if (cell.type === MINE) {
        glives--
        renderCounters('lives', '❤️', glives)
        gChanged.push({ type: 'clikedMine', changed: cell })
        if (glives > 0) return
        gameOver(false, cell)
        return
    }

    //updating pressed cell
    cell.isPressed = true
    elCell.classList.add('pressed')
    var value = (cell.mineNegsCount) ? cell.mineNegsCount : ''
    renderCell(coord, value)
    var changed = [cell]
        //handle negs
    if (!value) {
        for (var idx = 0; idx < cell.negs.length; idx++) {
            var negCoord = cell.negs[idx]
            var neg = gBoard[negCoord.i][negCoord.j]
            if (neg.isFlaged || neg.isPressed) continue
            if (neg.type !== MINE) {
                var elNeg = document.querySelector(getClassByCoord(negCoord))
                changed.push(neg)
                if (neg.mineNegsCount) {
                    neg.isPressed = true
                    elNeg.classList.add('pressed')
                    renderCell(negCoord, neg.mineNegsCount)
                } else {
                    cellClicked(elNeg)
                }
            }
        }
    }
    checkIfWin()

    gChanged.push({ type: 'click', changed, count: gRecCount })


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
    document.querySelector('.counter').innerHTML = gFlagCount
    gChanged.push({ type: 'mark', changed: [cell] })

}

function getHint() {
    if (gHints <= 0) return
    gIsHint = true
    renderCounters('hints', '🔎', gHints - 1, '💡')
}

function sefeClick() {
    var cell = getEmptyCell(gBoard)
    if (!cell) {
        alert('no empty cells found')
        return
    }
    var elCell = document.querySelector(getClassByCoord(cell.coord))
    if (gSafeClicks <= 0) return
    elCell.classList.add('safe')
    setInterval(function() { elCell.classList.remove('safe') }, 1500)
    gSafeClicks--
    var value = ''
    for (var i = 0; i < gSafeClicks; i++) {
        value += '|'
    }
    document.querySelector('.safe-click span').innerHTML = value

}

function undo() {
    if (!gGameOn) return
    if (!gChanged.length) return
    var change = gChanged.pop()
    if (change.type === 'click') {
        for (var count = change.count; count > 0; count--) {
            for (var i = 0; i < change.changed.length; i++) {
                var cell = change.changed[i]
                cell.isPressed = false
                var elCell = document.querySelector(getClassByCoord(cell.coord))
                elCell.classList.remove('pressed')
                renderCell(cell.coord, '')
            }
            if (count > 1) change = gChanged.pop()
        }
    } else if (change.type === 'mark') {
        var cell = change.changed[0]
        if (cell.isFlaged) {
            cell.isFlaged = false
            gFlagCount++
            renderCell(cell.coord, '')
        } else {
            cell.isFlaged = true
            gFlagCount--
            renderCell(cell.coord, '🏴‍☠')
        }
        document.querySelector('.counter').innerHTML = gFlagCount

    } else {
        glives++
        renderCounters('lives', '❤️', glives)
    }

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
    var gameTime = timer()
    clearInterval(gTimerInterval)
    renderCounters('timer', '0.000', 1)

    if (win) {
        //modal
        renderCounters('emoji', '🥳', 1)
        var elModal = document.querySelector('.win')
        if (typeof(Storage) !== 'undefined') {
            if (localStorage.bestScore) {
                if (gameTime <= localStorage.bestScore) {
                    localStorage.bestScore = gameTime
                    alert('new best score!!')
                }
            } else localStorage.setItem("bestScore", gameTime)
        }
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

function getClassByCoord(coord) {
    if (coord) {
        var i = coord.i
        var j = coord.j
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

function renderCell(location, value, cellClass = null, remove = false) {
    var elCell = document.querySelector(`.cell-${location.i}-${location.j}`);
    elCell.innerHTML = value;
    if (cellClass) {
        if (remove) elCell.classList.remove(cellClass)
        else elCell.classList.add(cellClass)
    }
}

function renderCounters(counterClass, value, num, value2 = null, num2 = 1) {
    var txt = '&nbsp&nbsp&nbsp'
    while (num > 0) {
        txt += value + '&nbsp&nbsp&nbsp'
        num--
    }
    if (value2) {
        while (num2 > 0) {
            txt += value2 + '&nbsp&nbsp&nbsp'
            num2--
        }
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