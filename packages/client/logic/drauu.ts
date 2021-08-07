import { computed, markRaw, nextTick, reactive, ref, watch } from 'vue'
import { Brush, createDrauu, DrawingMode } from 'drauu'
import { serverDrauuState } from '../env'
import { currentPage, isPresenter } from './nav'

export const brushColors = [
  '#ff595e',
  '#ffca3a',
  '#8ac926',
  '#1982c4',
  '#6a4c93',
  '#ffffff',
  '#000000',
]

export const drauuBrush = reactive<Brush>({
  color: brushColors[0],
  size: 4,
  mode: 'draw',
  simplify: true,
})

const _mode = ref<DrawingMode | 'arrow'>('draw')

export const drauuMode = computed({
  get() {
    return _mode.value
  },
  set(v: DrawingMode | 'arrow') {
    _mode.value = v
    if (v === 'arrow') {
      drauuBrush.mode = 'line'
      drauuBrush.arrowEnd = true
    }
    else {
      drauuBrush.mode = v
      drauuBrush.arrowEnd = false
    }
  },
})

export const drauuOptions = reactive({
  brush: drauuBrush,
})
export const drauuEnabled = ref(false)
export const canUndo = ref(false)
export const canRedo = ref(false)
export const canClear = ref(false)
export const isDrawing = ref(false)

export const drauuData = serverDrauuState

serverDrauuState.send = false

nextTick(() => {
  watch(isPresenter, (v) => {
    serverDrauuState.send = v
    serverDrauuState.receive = !v
  }, { immediate: true })
})

export const drauu = markRaw(createDrauu(drauuOptions))

export function clearDrauu() {
  drauu.clear()
  drauuData.value[currentPage.value] = ''
}

if (__DEV__) {
  drauu.on('changed', () => {
    canRedo.value = drauu.canRedo()
    canUndo.value = drauu.canUndo()
    canClear.value = !!drauu.el?.children.length
  })

  drauu.on('start', () => isDrawing.value = true)
  drauu.on('end', () => isDrawing.value = false)

  window.addEventListener('keydown', (e) => {
    if (!drauuEnabled.value)
      return

    const noModifier = !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey
    let handled = true
    if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
      if (e.shiftKey)
        drauu.redo()
      else
        drauu.undo()
    }
    else if (e.code === 'Escape') {
      drauuEnabled.value = false
    }
    else if (e.code === 'KeyL' && noModifier) {
      drauuMode.value = 'line'
    }
    else if (e.code === 'KeyA' && noModifier) {
      drauuMode.value = 'arrow'
    }
    else if (e.code === 'KeyD' && noModifier) {
      drauuMode.value = 'draw'
    }
    else if (e.code === 'KeyR' && noModifier) {
      drauuMode.value = 'rectangle'
    }
    else if (e.code === 'KeyE' && noModifier) {
      drauuMode.value = 'ellipse'
    }
    else if (e.code === 'KeyC' && noModifier) {
      clearDrauu()
    }
    else if (e.code.startsWith('Digit') && noModifier && +e.code[5] <= brushColors.length) {
      drauuBrush.color = brushColors[+e.code[5] - 1]
    }
    else {
      handled = false
    }

    if (handled) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, false)
}
