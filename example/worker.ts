import $ from '../src/worker'

interface RxFoo extends $.Reactive<RxFoo> {}
@$.reactive()
class RxFoo {
  // properties
  result = 555

  min = 100
  max = 1000

  // example reducers
  scale = $(this).reduce(({ min, max }) => max - min)
  normal = $(this).reduce(({ scale, min, result }) => (result - min) / scale)
}

const rx = new RxFoo()
console.log(rx.normal)
