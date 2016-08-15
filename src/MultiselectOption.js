export default {
  functional: true,
  render: function (h, context) {
    return context.props.optionFunction(h, context.props.option, context.props.label)
  },
  props: {
    optionFunction: {
      type: Function,
      required: true
    },
    label: {
      required: true
    },
    option: {}
  }
}
