import { deepClone } from './utils';

function isEmpty(opt) {
	if (opt === 0) return false;
	if (Array.isArray(opt) && opt.length === 0) return true;
	return !opt;
}

function includes(st, query) {
	/* istanbul ignore else */
	let str = st;
	if (str === undefined) str = 'undefined';
	if (str === null) str = 'null';
	if (str === false) str = 'false';
	const text = str.toString().toLowerCase();
	return text.indexOf(query.trim()) !== -1;
}

function filterOptions(options, search, label, customLabel) {
	return options.filter(option => includes(customLabel(option, label), search));
}

function stripGroups(options) {
	return options.filter(option => !option.$isLabel);
}

function flattenOptions(values, label) {
	return options =>
		options.reduce((prev, curr) => {
			/* istanbul ignore else */
			if (curr[values] && curr[values].length) {
				prev.push({
					$groupLabel: curr[label],
					$isLabel: true,
				});
				return prev.concat(curr[values]);
			}
			return prev;
		}, []);
}

function filterGroups(search, label, values, groupLabel, customLabel) {
	return groups =>
		groups.map((group) => {
			/* istanbul ignore else */
			if (!group[values]) {
				console.warn('Options passed to vue-multiselect do not contain groups, despite the config.');
				return [];
			}
			const groupOptions = filterOptions(group[values], search, label, customLabel);

			return groupOptions.length
				? {
					[groupLabel]: group[groupLabel],
					[values]: groupOptions,
				}
				: [];
		});
}

const flow = (...fns) => x => fns.reduce((v, f) => f(v), x);

export default {
	data() {
		return {
			parentWrapper: null,
			scrollableParent: null,
			search: '',
			isOpen: false,
			prefferedOpenDirection: 'below',
			optimizedHeight: this.maxHeight,
			internalValue: [],

			updatePosTimeout: null,
		};
	},
	props: {
		/**
		 * Where to append the element. Default value is body
		 */
		parentToAppend: null,
		/**
		 * Decide whether to filter the results based on search query.
		 * Useful for async filtering, where we search through more complex data.
		 * @type {Boolean}
		 */
		internalSearch: {
			type: Boolean,
			default: true,
		},
		/**
		 * Array of available options: Objects, Strings or Integers.
		 * If array of objects, visible label will default to option.label.
		 * If `labal` prop is passed, label will equal option['label']
		 * @type {Array}
		 */
		options: {
			type: Array,
			required: true,
		},
		/**
		 * Equivalent to the `multiple` attribute on a `<select>` input.
		 * @default false
		 * @type {Boolean}
		 */
		multiple: {
			type: Boolean,
			default: false,
		},
		/**
		 * Presets the selected options value.
		 * @type {Object||Array||String||Integer}
		 */
		value: {
			type: null,
			default() {
				return [];
			},
		},
		/**
		 * Key to compare objects
		 * @default 'id'
		 * @type {String}
		 */
		trackBy: {
			type: String,
		},
		/**
		 * Label to look for in option Object
		 * @default 'label'
		 * @type {String}
		 */
		label: {
			type: String,
		},
		/**
		 * Enable/disable search in options
		 * @default true
		 * @type {Boolean}
		 */
		searchable: {
			type: Boolean,
			default: true,
		},
		/**
		 * Clear the search input after select()
		 * @default true
		 * @type {Boolean}
		 */
		clearOnSelect: {
			type: Boolean,
			default: true,
		},
		/**
		 * Hide already selected options
		 * @default false
		 * @type {Boolean}
		 */
		hideSelected: {
			type: Boolean,
			default: false,
		},
		/**
		 * Equivalent to the `placeholder` attribute on a `<select>` input.
		 * @default 'Select option'
		 * @type {String}
		 */
		placeholder: {
			type: String,
			default: 'Select option',
		},
		/**
		 * Allow to remove all selected values
		 * @default true
		 * @type {Boolean}
		 */
		allowEmpty: {
			type: Boolean,
			default: false,
		},
		/**
		 * Reset this.internalValue, this.search after this.internalValue changes.
		 * Useful if want to create a stateless dropdown.
		 * @default false
		 * @type {Boolean}
		 */
		resetAfter: {
			type: Boolean,
			default: false,
		},
		/**
		 * Enable/disable closing after selecting an option
		 * @default true
		 * @type {Boolean}
		 */
		closeOnSelect: {
			type: Boolean,
			default: true,
		},
		/**
		 * Function to interpolate the custom label
		 * @default false
		 * @type {Function}
		 */
		customLabel: {
			type: Function,
			default(option, label) {
				if (isEmpty(option)) return '';
				return label ? option[label] : option;
			},
		},
		/**
		 * Additional CSS class to apply on the underlying input element. Anything supported by v-bind:class is allowed.
		 * @default null
		 */
		inputClass: {
			default: null,
		},
		/**
		 * Additional CSS class to apply on the underlying input container element. Anything supported by v-bind:class is allowed.
		 * @default null
		 */
		inputContainerClass: {
			default: null,
		},
		/**
		 * Disable / Enable tagging
		 * @default false
		 * @type {Boolean}
		 */
		taggable: {
			type: Boolean,
			default: false,
		},
		/**
		 * String to show when highlighting a potential tag
		 * @default 'Press enter to create a tag'
		 * @type {String}
		 */
		tagPlaceholder: {
			type: String,
			default: 'Press enter to create a tag',
		},
		/**
		 * By default new tags will appear above the search results.
		 * Changing to 'bottom' will revert this behaviour
		 * and will proritize the search results
		 * @default 'top'
		 * @type {String}
		 */
		tagPosition: {
			type: String,
			default: 'top',
		},
		/**
		 * Number of allowed selected options. No limit if 0.
		 * @default 0
		 * @type {Number}
		 */
		max: {
			type: [Number, Boolean],
			default: false,
		},
		/**
		 * Will be passed with all events as second param.
		 * Useful for identifying events origin.
		 * @default null
		 * @type {String|Integer}
		 */
		id: {
			default: null,
		},
		/**
		 * Limits the options displayed in the dropdown
		 * to the first X options.
		 * @default 1000
		 * @type {Integer}
		 */
		optionsLimit: {
			type: Number,
			default: 1000,
		},
		/**
		 * Name of the property containing
		 * the group values
		 * @default 1000
		 * @type {String}
		 */
		groupValues: {
			type: String,
		},
		/**
		 * Name of the property containing
		 * the group label
		 * @default 1000
		 * @type {String}
		 */
		groupLabel: {
			type: String,
		},
		/**
		 * Array of keyboard keys to block
		 * when selecting
		 * @default 1000
		 * @type {String}
		 */
		blockKeys: {
			type: Array,
			default() {
				return [];
			},
		},
		preserveSearch: {
			type: Boolean,
			default: false,
		},

		/**
		 * First selected value, even if
		 * it's not on options
		 * @default null
		 * @type {Object|String}
		 */
		firstValue: {
			type: [Object, String],
			default() {
				return null;
			},
		},
	},
	mounted() {
		/* istanbul ignore else */
		if (!this.multiple && !this.clearOnSelect) {
			console.warn('[Vue-Multiselect warn]: ClearOnSelect and Multiple props can’t be both set to false.');
		}
		if (!this.multiple && this.max) {
			console.warn('[Vue-Multiselect warn]: Max prop should not be used when prop Multiple equals false.');
		}
	},
	computed: {
		filteredOptions() {
			const search = this.search || '';
			const normalizedSearch = search.toLowerCase().trim();

			let options = (this.options || []).concat();

			if (this.allowEmpty) {
				options = [{ [this.trackBy]: null, [this.label]: this.deselectLabelText }, ...options];
			}

			/* istanbul ignore else */
			if (this.internalSearch) {
				options = this.groupValues
					? this.filterAndFlat(options, normalizedSearch, this.label)
					: filterOptions(options, normalizedSearch, this.label, this.customLabel);
			} else {
				options = this.groupValues ? flattenOptions(this.groupValues, this.groupLabel)(options) : options;
			}

			options = this.hideSelected
				? options.filter(this.isNotSelected)
				: options;

			/* istanbul ignore else */
			if (this.taggable && normalizedSearch.length && !this.isExistingOption(normalizedSearch)) {
				if (this.tagPosition === 'bottom') {
					options.push({ isTag: true, label: normalizedSearch });
				} else {
					options.unshift({ isTag: true, label: normalizedSearch });
				}
			}

			const items = options.slice(0, this.optionsLimit);

			return items;
		},
		valueKeys() {
			return this.internalValue.map(this.getOptionValue);
		},
		optionKeys() {
			const options = this.groupValues ? this.flatAndStrip(this.options) : this.options;
			return options.map(element => this.customLabel(element, this.label).toString().toLowerCase());
		},
		currentOptionLabel() {
			return this.multiple
				? null
				: this.internalValue.length
					? this.getOptionLabel(this.internalValue[0])
					: null;
		},

		internalPlaceholder() {
			return this.isOpen && this.currentOptionLabel ? this.currentOptionLabel : this.placeholder;
		},

		isAbove() {
			if (this.openDirection === 'above' || this.openDirection === 'top') {
				return true;
			}
			if (this.openDirection === 'below' || this.openDirection === 'bottom') {
				return false;
			}
			return this.prefferedOpenDirection === 'above';
		},

		selectWidth() {
			if (this.$el) {
				return this.$el.offsetWidth + 'px';
			}

			return '100%';
		},
	},
	methods: {
		/**
		 * Returns the first scrollable parent of passed Element
		 * @param {Element} element to check
		 * @param {Element} what will return if none has found (document by default)
		 */
		getScrollParent(node, defaultReturn = document) {
			const isElement = node instanceof HTMLElement;
			const overflowY = isElement && window.getComputedStyle(node).overflowY;
			const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';

			if (!node) {
				return null;
			}
			if (isScrollable && node.scrollHeight > node.clientHeight) {
				return node;
			}

			return this.getScrollParent(node.parentNode, defaultReturn) || defaultReturn;
		},

		/**
		 * Returns the current fullscreen element or body if has none.
		 * @returns {Element}
		 */
		getFullscreenElement() {
			if (this.parentToAppend) {
				return this.parentToAppend;
			}

			const fullscreen = (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement);

			return fullscreen || document.body;
		},

		/**
		 * Appends the list wrapper on the found scrollableParent, or returns it to the original parent
		 */
		setWrapperPos() {
			const { listWrapper } = this.$refs;

			this.updatePos();

			if (this.isOpen) {
				if (!this.parentWrapper) this.parentWrapper = listWrapper.parentElement;
				if (!this.scrollableParent) {
					this.scrollableParent = this.getScrollParent(this.$el.parentNode);
					if (this.scrollableParent) this.scrollableParent.addEventListener('scroll', this.updatePos);
				}
				// const { top, left, width, height } = this.$el.getBoundingClientRect();
				//
				const fullscreenEl = this.getFullscreenElement();
				fullscreenEl.appendChild(listWrapper);
				//
				// listWrapper.style.width = `${width}px`;
				// listWrapper.style.left = `${left}px`;
				// if (this.isAbove) {
				// 	listWrapper.classList.add('above');
				// 	listWrapper.style.top = 'auto';
				// 	listWrapper.style.bottom = this.searchable
				// 		? `${window.innerHeight - top + height}px`
				// 		: `${window.innerHeight - top}px`;
				// } else {
				// 	listWrapper.classList.remove('above');
				// 	listWrapper.style.bottom = 'auto';
				// 	listWrapper.style.top = `${top + height}px`;
				// }

				if (this.searchable) {
					if (!this.preserveSearch) this.search = '';
					this.$nextTick(() => {
						if (this.$refs.search) this.$refs.search.focus();
					});
				} else if (this.$el) this.$el.focus();
			} else if (this.parentWrapper && listWrapper) {
				this.parentWrapper.appendChild(listWrapper);
			}
		},

		/**
		 * Updates listWrapper position based on $el rect
		 */
		updatePos() {
			if (this.isOpen) {
				if (this.updatePosTimeout) clearTimeout(this.updatePosTimeout);

				this.updatePosTimeout = setTimeout(() => {
					const { listWrapper } = this.$refs;
					const { top, bottom, left, width } = this.$el.getBoundingClientRect();

					listWrapper.style.width = `${width}px`;
					listWrapper.style.left = `${left}px`;

					if (this.isAbove) {
						listWrapper.classList.add('above');
						listWrapper.style.top = 'auto';
						listWrapper.style.bottom = this.searchable
							? `${window.innerHeight - bottom}px`
							: `${window.innerHeight - top}px`;
					} else {
						listWrapper.classList.remove('above');
						listWrapper.style.bottom = 'auto';
						listWrapper.style.top = this.searchable
							? `${top}px`
							: `${bottom}px`;
					}
				}, 0);
			}
		},

		/**
		 * Activate when some char or digit are typed on closed multiselect
		 * @param {InputEvent}
		 */
		startTyping(e) {
			if (!this.isOpen && /\w|\d/.test(e.char)) {
				this.search += e.key;
				this.activate();
			}
		},
		/**
		 * Converts the internal value to the external value
		 * @returns {Object||Array||String||Integer} returns the external value
		 */
		getValue() {
			return deepClone(
				this.multiple
					? this.internalValue.map(this.getOptionValue)
					: this.getOptionValue(this.internalValue[0]) || null,
			);
		},

		/**
		 * Converts the external value to the internal value
		 * @returns {Array} returns the internal value
		 */
		getInternalValue(value, defaultVal = isEmpty(this.internalValue) ? this.firstValue : this.internalValue) {
			return value === null || value === undefined
				? []
				: deepClone(
					defaultVal instanceof Array
						? defaultVal.map(v => this.transformLocalValue(value, v))
						: [this.transformLocalValue(value, defaultVal)],
				);
		},

		/**
		 * Returns the equivalent option of the received value
		 * @param {Object|String} current value
		 * @returns {Object}
		 */
		transformLocalValue(value, defaultVal) {
			return (this.options || [])
				.find(item => this.getOptionValue(item) === this.getOptionValue(value))
				|| defaultVal
				|| { [this.trackBy]: '', [this.label]: '' };
		},

		/**
		 * Filters and then flattens the options list
		 * @param  {Array}
		 * @returns {Array} returns a filtered and flat options list
		 */
		filterAndFlat(options, search, label) {
			return flow(
				filterGroups(search, label, this.groupValues, this.groupLabel, this.customLabel),
				flattenOptions(this.groupValues, this.groupLabel),
			)(options);
		},

		/**
		 * Flattens and then strips the group labels from the options list
		 * @param  {Array}
		 * @returns {Array} returns a flat options list without group labels
		 */
		flatAndStrip(options) {
			return flow(
				flattenOptions(this.groupValues, this.groupLabel),
				stripGroups,
			)(options);
		},
		/**
		 * Finds out if the given query is already present
		 * in the available options
		 * @param  {String}
		 * @returns {Boolean} returns true if element is available
		 */
		isExistingOption(query) {
			return !this.options
				? false
				: this.optionKeys.indexOf(query) > -1;
		},
		/**
		 * Finds out if the given element is already present
		 * in the result value
		 * @param  {Object||String||Integer} option passed element to check
		 * @returns {Boolean} returns true if element is selected
		 */
		isSelected(option) {
			const opt = this.getOptionValue(option);
			return this.valueKeys.indexOf(opt) > -1;
		},
		/**
		 * Finds out if the given element is NOT already present
		 * in the result value. Negated isSelected method.
		 * @param  {Object||String||Integer} option passed element to check
		 * @returns {Boolean} returns true if element is not selected
		 */
		isNotSelected(option) {
			return !this.isSelected(option);
		},
		/**
		 * Returns empty string when options is null/undefined
		 * Returns tag query if option is tag.
		 * Returns the customLabel() results and casts it to string.
		 *
		 * @param  {Object||String||Integer} Passed option
		 * @returns {Object||String}
		 */
		getOptionLabel(option) {
			/* istanbul ignore else */
			if (isEmpty(option)) {
				if (!this.trackBy) return this.deselectLabelText;
				return '';
			}
			/* istanbul ignore else */
			if (option.isTag) return option.label;
			/* istanbul ignore else */
			if (option.$isLabel) return option.$groupLabel;

			const label = this.customLabel(option, this.label);
			/* istanbul ignore else */
			if (isEmpty(label)) return '';
			return label;
		},

		getOptionValue(option) {
			return this.trackBy && Object.prototype.hasOwnProperty.call(option || {}, this.trackBy)
				? option[this.trackBy]
				: option;
		},

		/**
		 * Add the given option to the list of selected options
		 * or sets the option as the selected option.
		 * If option is already selected -> remove it from the results.
		 *
		 * @param  {Object||String||Integer} option to select/deselect
		 * @param  {Boolean} block removing
		 */
		select(option, key) {
			if (this.$el) this.$el.focus();

			if (!option) {
				if (this.pointer < 0 && this.allowEmpty) {
					this.removeAll();
				}
				return;
			}

			/* istanbul ignore else */
			if (this.blockKeys.indexOf(key) !== -1 || this.disabled || option.$isLabel || option.$isDisabled) return;
			/* istanbul ignore else */
			if (this.max && this.multiple && this.internalValue.length === this.max) return;
			/* istanbul ignore else */
			if (key === 'Tab' && !this.pointerDirty) return;
			if (option.isTag) {
				this.$emit('tag', this.getOptionLabel(option), this.id);
				this.search = '';
				if (this.closeOnSelect && !this.multiple) this.deactivate();
			} else {
				if (this.multiple) {
					this.internalValue.push(option);
				} else {
					this.internalValue = [option];
				}
				this.$emit('select', deepClone(option), this.id);
				this.$emit('input', this.getValue(), this.id);

				/* istanbul ignore else */
				if (this.clearOnSelect) this.search = '';
			}

			/* istanbul ignore else */
			if (this.closeOnSelect) this.deactivate();
		},
		/**
		 * Removes the given option from the selected options.
		 * Additionally checks this.allowEmpty prop if option can be removed when
		 * it is the last selected option.
		 *
		 * @param  {type} option description
		 * @returns {type}        description
		 */
		removeElement(option, shouldClose = true) {
			/* istanbul ignore else */
			if (this.disabled) return;
			/* istanbul ignore else */
			if (!this.allowEmpty && this.internalValue.length <= 1) {
				this.deactivate();
				return;
			}

			const index = this.valueKeys.indexOf(this.getOptionValue(option));

			this.internalValue.splice(index, 1);
			this.$emit('input', this.getValue(), this.id);
			this.$emit('remove', deepClone(option), this.id);

			/* istanbul ignore else */
			if (this.closeOnSelect && shouldClose) this.deactivate();
		},
		/**
		 * Calls this.removeElement() with the last element
		 * from this.internalValue (selected element Array)
		 *
		 * @fires this#removeElement
		 */
		removeLastElement() {
			/* istanbul ignore else */
			if (this.blockKeys.indexOf('Delete') !== -1) return;
			/* istanbul ignore else */
			if (this.search.length === 0 && Array.isArray(this.internalValue)) {
				this.removeElement(this.internalValue[this.internalValue.length - 1], false);
			}
		},
		/**
		 * Remove all selections.
		 * Sets this.internalValue to []
		 */
		removeAll() {
			const vals = deepClone(this.internalValue);
			this.internalValue = [];

			vals.forEach((v) => {
				this.$emit('remove', deepClone(v), this.id);
			});

			this.$emit('input', this.getValue(), this.id);
			if (this.closeOnSelect && !this.multiple) this.deactivate();
		},
		/**
		 * Opens the multiselect’s dropdown.
		 * Sets this.isOpen to TRUE
		 */
		activate() {
			/* istanbul ignore else */
			if (this.isOpen || this.disabled) return;

			this.adjustPosition();

			const lastValId = this.getOptionValue(this.internalValue[this.internalValue.length - 1]);
			const lsIndex = this.filteredOptions.findIndex(v => this.getOptionValue(v) === lastValId);
			this.pointer = Math.max(0, lsIndex);

			/* istanbul ignore else  */
			if (this.groupValues && this.pointer === 0 && this.filteredOptions.length) {
				this.pointer = 1;
			}

			this.isOpen = true;
			this.$emit('open', this.id);
		},
		/**
		 * Closes the multiselect’s dropdown.
		 * Sets this.isOpen to FALSE
		 */
		deactivate() {
			/* istanbul ignore else */
			if (!this.isOpen) return;

			this.isOpen = false;

			this.$el.focus();

			if (!this.preserveSearch) this.search = '';
			this.$emit('close', this.getValue(), this.id);
		},
		/**
		 * Call this.activate() or this.deactivate()
		 * depending on this.isOpen value.
		 *
		 * @fires this#activate || this#deactivate
		 * @property {Boolean} isOpen indicates if dropdown is open
		 */
		toggle() {
			if (this.isOpen) {
				this.deactivate();
				return;
			}

			this.activate();
		},
		/**
		 * Updates the hasEnoughSpace variable used for
		 * detecting where to expand the dropdown
		 */
		adjustPosition() {
			if (typeof window === 'undefined') return;

			const spaceAbove = this.$el.getBoundingClientRect().top;
			const spaceBelow = window.innerHeight - this.$el.getBoundingClientRect().bottom;
			const hasEnoughSpaceBelow = spaceBelow > this.maxHeight;

			if (hasEnoughSpaceBelow || spaceBelow > spaceAbove || this.openDirection === 'below' || this.openDirection === 'bottom') {
				this.prefferedOpenDirection = 'below';
				this.optimizedHeight = Math.min(spaceBelow - 40, this.maxHeight);
			} else {
				this.prefferedOpenDirection = 'above';
				this.optimizedHeight = Math.min(spaceAbove - 40, this.maxHeight);
			}
		},

		checkListScroll() {
			const { list } = this.$refs;

			if (list) {
				const endLine = list.scrollHeight - (list.scrollHeight * 0.2);

				if (list.scrollTop + list.offsetHeight >= endLine) {
					this.$emit('scrollEnd');
				}
			}
		},

		/**
		 * Handles the touchstart stop propagation.
		 * Selects an option on mobile devices with one click
		 * @param index
		 * @param option
		 */
		handleTouchStartStop(index, option) {
			this.pointerSet(index);
			this.select(option);
		},

	},

	watch: {
		options() {
			this.internalValue = this.getInternalValue(this.value);
		},

		isOpen() {
			this.$nextTick(this.setWrapperPos);
		},

		value: {
			immediate: true,
			handler(value) {
				this.internalValue = this.getInternalValue(value);
			},
		},

		firstValue: {
			immediate: true,
			handler() {
				this.internalValue = this.getInternalValue(this.value);
			},
		},

		internalValue() {
			/* istanbul ignore else */
			if (this.resetAfter && this.internalValue.length) {
				this.search = '';
				this.internalValue = [];
			}
		},

		search() {
			this.$emit('search-change', this.search, this.id);
		},
	},

};
