export default {
	data() {
		return {
			pointer: 0,
			pointerDirty: false,
		};
	},
	props: {
		/**
		 * Enable/disable highlighting of the pointed value.
		 * @type {Boolean}
		 * @default true
		 */
		showPointer: {
			type: Boolean,
			default: true,
		},
	},
	computed: {
		optionHeight() {
			const first = (this.$refs.list.getElementsByTagName('li') || [])[0];
			return first ? first.offsetHeight : 40;
		},

		pointerPosition() {
			if (this.allowEmpty) {
				return (this.pointer + 1) * this.optionHeight;
			}
			return this.pointer * this.optionHeight;
		},

		visibleElements() {
			return this.$refs.list && this.$refs.list.offsetHeight / this.optionHeight;
		},
	},
	watch: {
		filteredOptions() {
			this.pointerAdjust();
		},
		isOpen() {
			this.pointerDirty = false;
		},
	},
	methods: {
		optionHighlight(index, option) {
			return {
				'multiselect__option--highlight': index === this.pointer && this.showPointer,
				'multiselect__option--selected': option && this.isSelected(option),
			};
		},
		deselectHighlight(index) {
			return {
				'deselect__option--highlight': index === this.pointer && this.showPointer,
			};
		},
		addPointerElement({ key } = 'Enter') {
			/* istanbul ignore else */
			if (this.filteredOptions.length > 0) {
				this.select(this.filteredOptions[this.pointer], key);
			}
			this.pointerReset();
		},
		pointerForward() {
			if (!this.isOpen) {
				this.activate();
				this.$nextTick(() => this.pointerForward());
				return;
			}

			/* istanbul ignore else */
			if (this.pointer < this.filteredOptions.length - 1) {
				this.pointer++;
				/* istanbul ignore next */
				if (this.$refs.list.scrollTop <= this.pointerPosition - (this.visibleElements - 1) * this.optionHeight) {
					this.$refs.list.scrollTop = this.pointerPosition - (this.visibleElements - 1) * this.optionHeight;
				}
				/* istanbul ignore else */
				if (this.filteredOptions[this.pointer].$isLabel) this.pointerForward();
			}
			this.pointerDirty = true;
		},
		pointerBackward() {
			if (!this.isOpen) {
				this.activate();
				this.$nextTick(() => this.pointerBackward());
				return;
			}

			if (this.pointer > (this.allowEmpty ? -1 : 0)) {
				this.pointer--;
				/* istanbul ignore else */
				if (this.$refs.list.scrollTop >= this.pointerPosition) {
					this.$refs.list.scrollTop = this.pointerPosition;
				}
				/* istanbul ignore else */
				if (this.filteredOptions[this.pointer].$isLabel) this.pointerBackward();
			} else if (this.filteredOptions[0].$isLabel) {
				/* istanbul ignore else */
				this.pointerForward();
			}
			this.pointerDirty = true;
		},
		pointerReset() {
			/* istanbul ignore else */
			if (!this.closeOnSelect) return;
			this.pointer = 0;
			/* istanbul ignore else */
			if (this.$refs.list) {
				this.$refs.list.scrollTop = 0;
			}
		},
		pointerAdjust() {
			/* istanbul ignore else */
			if (this.pointer >= this.filteredOptions.length - 1) {
				this.pointer = this.filteredOptions.length
					? this.filteredOptions.length - 1
					: 0;
			}
		},
		pointerSet(index) {
			this.pointer = index;
			this.pointerDirty = true;
		},
	},
};
