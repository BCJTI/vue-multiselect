<template>
	<div
			:tabindex="searchable && isOpen ? -1 : tabindex"
			:class="{ 'multiselect--active': isOpen, 'multiselect--disabled': disabled, 'multiselect--above': isAbove }"
			:name="name"
			:id="id"
			@click="activate()"
			@focus="activate()"
			@keydown.self.down.prevent="pointerForward()"
			@keydown.self.up.prevent="pointerBackward()"
			@keydown.enter.tab.stop.self="addPointerElement($event)"
			@keyup.esc="deactivate()"
			class="multiselect"
	>
		<!--
			Quando corrigir isso, remover o stopPropagation do click
			@blur="searchable ? false : deactivate()"
		-->
		<slot name="carret" v-if="placeholder === internalPlaceholder">
			<div @mousedown.prevent.stop="toggle()" class="multiselect__select"></div>
		</slot>
		<slot name="clear" :search="search"></slot>
		<div ref="tags" class="multiselect__tags" :class="{'custom-placeholder': placeholder !== internalPlaceholder}">
			<div class="multiselect__tags-wrap" v-show="visibleValue.length > 0">
				<template v-for="option of visibleValue" @mousedown.prevent>
					<slot name="tag" :option="option" :search="search" :remove="removeElement">
						<span class="multiselect__tag">
							<span v-text="getOptionLabel(option)"></span>
							<i
									aria-hidden="true" tabindex="1" @keydown.enter.prevent="removeElement(option)"
									@mousedown.prevent="removeElement(option)" class="multiselect__tag-icon"
							></i>
						</span>
					</slot>
				</template>
			</div>
			<template v-if="internalValue && internalValue.length > limit">
				<strong class="multiselect__strong" v-text="limitText(internalValue.length - limit)"></strong>
			</template>
			<transition name="multiselect__loading">
				<slot name="loading">
					<div v-show="loading" class="multiselect__spinner"></div>
				</slot>
			</transition>
			<input
					ref="search"
					:name="name + '-input'"
					:id="id + '-input'"
					type="text"
					autocomplete="off"
					:placeholder="internalPlaceholder"
					v-if="searchable && isOpen"
					:style="inputStyle"
					:value="isOpen ? search : currentOptionLabel"
					:disabled="disabled"
					:tabindex="tabindex"
					@input="updateSearch($event.target.value)"
					@focus.prevent="activate()"
					@keyup.esc="deactivate()"
					@keydown.down.prevent="pointerForward()"
					@keydown.up.prevent="pointerBackward()"
					@keydown.enter.prevent.stop.self="addPointerElement($event)"
					@keydown.delete.stop="removeLastElement()"
					class="multiselect__input"
			/>
			<span
					v-if="!searchable || !isOpen"
					class="multiselect__single"
			>
				<slot v-if="currentOptionLabel" name="singleLabel" :option="currentOptionLabel">
					<template>{{ currentOptionLabel }}</template>
				</slot>
				<template v-else>{{ internalPlaceholder }}</template>
			</span>
		</div>
		<transition name="multiselect">
			<div
					class="multiselect__content-wrapper"
					v-show="isOpen"
					@mousedown.prevent
					:style="{ maxHeight: optimizedHeight + 'px' }"
					ref="list">
				<ul class="multiselect__content" :style="contentStyle">
					<slot name="beforeList"></slot>
					<li v-if="multiple && max === internalValue.length">
						<span class="multiselect__option">
							<slot name="maxElements">Maximum of {{ max }} options selected. First remove a selected option to select another.</slot>
						</span>
					</li>
					<template v-else>
						<li class="multiselect__element" v-for="(option, index) of filteredOptions" :key="index">
							<span
									v-if="!(option && (option.$isLabel || option.$isDisabled))"
									:class="optionHighlight(index, option)"
									@mousedown.stop="select(option)"
									@mouseenter.self="pointerSet(index)"
									:data-select="option && option.isTag ? tagPlaceholder : selectLabelText"
									:data-selected="selectedLabelText"
									class="multiselect__option">
								<slot name="option" :option="option" :search="search">
									<span>{{ getOptionLabel(option) }}</span>
								</slot>
							</span>
							<span
									v-if="option && (option.$isLabel || option.$isDisabled)"
									:class="optionHighlight(index, option)"
									class="multiselect__option multiselect__option--disabled">
								<slot name="option" :option="option" :search="search">
									<span>{{ getOptionLabel(option) }}</span>
								</slot>
							</span>
						</li>
					</template>
					<li v-show="showNoResults && (filteredOptions.length === 0 && search && !loading)">
						<span class="multiselect__option">
							<slot name="noResult">No elements found. Consider changing the search query.</slot>
						</span>
					</li>
					<slot name="afterList"></slot>
				</ul>
			</div>
		</transition>
	</div>
</template>

<script>
	import multiselectMixin from './multiselectMixin';
	import pointerMixin from './pointerMixin';

	export default {
		name: 'vue-multiselect',
		mixins: [multiselectMixin, pointerMixin],

		props: {

			/**
			 * name attribute to match optional label element
			 * @default ''
			 * @type {String}
			 */
			name: {
				type: String,
				default: '',
			},
			/**
			 * String to show when pointing to an option
			 * @default 'Press enter to select'
			 * @type {String}
			 */
			selectLabel: {
				type: String,
				default: 'Press enter to select',
			},
			/**
			 * String to show next to selected option
			 * @default 'Selected'
			 * @type {String}
			 */
			selectedLabel: {
				type: String,
				default: 'Selected',
			},
			/**
			 * String to show when pointing to an alredy selected option
			 * @default 'Press enter to remove'
			 * @type {String}
			 */
			deselectLabel: {
				type: String,
				default: 'None',
			},
			/**
			 * Decide whether to show pointer labels
			 * @default true
			 * @type {Boolean}
			 */
			showLabels: {
				type: Boolean,
				default: true,
			},
			/**
			 * Limit the display of selected options. The rest will be hidden within the limitText string.
			 * @default 99999
			 * @type {Integer}
			 */
			limit: {
				type: Number,
				default: 99999,
			},
			/**
			 * Sets maxHeight style value of the dropdown
			 * @default 300
			 * @type {Integer}
			 */
			maxHeight: {
				type: Number,
				default: 300,
			},
			/**
			 * Function that process the message shown when selected
			 * elements pass the defined limit.
			 * @default 'and * more'
			 * @param {Int} count Number of elements more than limit
			 * @type {Function}
			 */
			limitText: {
				type: Function,
				default: count => `and ${count} more`,
			},
			/**
			 * Set true to trigger the loading spinner.
			 * @default False
			 * @type {Boolean}
			 */
			loading: {
				type: Boolean,
				default: false,
			},
			/**
			 * Disables the multiselect if true.
			 * @default false
			 * @type {Boolean}
			 */
			disabled: {
				type: Boolean,
				default: false,
			},
			/**
			 * Fixed opening direction
			 * @default ''
			 * @type {String}
			 */
			openDirection: {
				type: String,
				default: '',
			},
			showNoResults: {
				type: Boolean,
				default: true,
			},
			autofocus: {
				type: Boolean,
				default: false,
			},
			tabindex: {
				type: Number,
				default: 0,
			},
			selectFirst: null,
		},

		data() {
			return {
				internalValue: this.getInternalValue(this.value),
				contentContainer: null,
				internalPlaceholder: this.placeholder,
			};
		},

		mounted() {
			this.contentContainer = this.$el ? this.$el.querySelector('.multiselect__content-wrapper') : null;
			if (this.contentContainer) this.contentContainer.addEventListener('wheel', this.scrollContent);

			if (this.autofocus) this.activate();

			if (!this.internalValue.length && this.options.length && this.selectFirst) {
				this.select(this.filteredOptions[0]);
			}

			document.addEventListener('mousedown', this.close);
		},

		beforeDestroy() {
			this.isOpen = false;
			this.setWrapperPos();

			document.removeEventListener('mousedown', this.close);
			if (this.scrollableParent) this.scrollableParent.removeEventListener('scroll', this.updatePos);
			if (this.contentContainer) this.contentContainer.removeEventListener('wheel', this.scrollContent);
		},

		computed: {
			visibleValue() {
				return this.multiple
					? this.internalValue.slice(0, this.limit)
					: [];
			},
			selectLabelText() {
				return this.showLabels
					? this.selectLabel
					: '';
			},
			deselectLabelText() {
				return this.showLabels
					? this.deselectLabel
					: '-';
			},
			selectedLabelText() {
				return this.showLabels
					? this.selectedLabel
					: '';
			},
			inputStyle() {
				if (this.multiple && this.value && this.value.length) {
					// Hide input by setting the width to 0 allowing it to receive focus
					return this.isOpen ? { 'width': 'auto' } : {
						'width': '0',
						'position': 'absolute',
					};
				}

				return undefined;
			},
			contentStyle() {
				return this.options && this.options.length
					? { 'display': 'inline-block' }
					: { 'display': 'block' };
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
		},

		methods: {

			close() {
				this.isOpen = false;
			},

			scrollContent() {
				if (!this.loading && this.contentContainer) {
					const content = this.contentContainer.querySelector('.multiselect__content');
					const containerHeight = this.contentContainer.offsetHeight;
					const height = content.offsetHeight;
					const scrollTop = this.contentContainer.scrollTop;
					this.$emit('scrollEnd', scrollTop + containerHeight >= height);
				}
			},

		},

		watch: {
			options() {
				this.internalValue = this.getInternalValue(this.value);
			},

			isOpen(val) {
				this.setWrapperPos();
				this.internalPlaceholder = val && this.currentOptionLabel ? this.currentOptionLabel : this.placeholder;
			},
		},

	};
</script>

<style>

	fieldset[disabled] .multiselect {
		pointer-events: none;
	}

	.multiselect__spinner {
		position: absolute;
		right: 1px;
		top: 1px;
		width: 48px;
		height: 35px;
		background: #fff;
		display: block;
	}

	.multiselect--disabled .multiselect__spinner {
		background: #ededed;
	}

	.multiselect__spinner:before,
	.multiselect__spinner:after {
		position: absolute;
		content: "";
		top: 50%;
		left: 50%;
		margin: -8px 0 0 -8px;
		width: 16px;
		height: 16px;
		border-radius: 100%;
		border-color: #41B883 transparent transparent;
		border-style: solid;
		border-width: 2px;
		box-shadow: 0 0 0 1px transparent;
	}

	.multiselect__spinner:before {
		animation: spinning 2.4s cubic-bezier(0.41, 0.26, 0.2, 0.62);
		animation-iteration-count: infinite;
	}

	.multiselect__spinner:after {
		animation: spinning 2.4s cubic-bezier(0.51, 0.09, 0.21, 0.8);
		animation-iteration-count: infinite;
	}

	.multiselect__loading-enter-active,
	.multiselect__loading-leave-active {
		transition: opacity 0.4s ease-in-out;
		opacity: 1;
	}

	.multiselect__loading-enter,
	.multiselect__loading-leave-active {
		opacity: 0;
	}

	.multiselect,
	.multiselect__input,
	.multiselect__single {
		font-family: inherit;
		font-size: 14px;
		touch-action: manipulation;
	}

	.multiselect {
		box-sizing: content-box;
		display: block;
		position: relative;
		width: 100%;
		min-height: 40px;
		text-align: left;
		color: #35495E;
		background: #fff;
	}

	.multiselect * {
		box-sizing: border-box;
	}

	.multiselect:focus {
		outline: none;
	}

	.multiselect--disabled {
		pointer-events: none;
		opacity: 0.6;
	}

	.multiselect--active {
		z-index: 50;
	}

	.multiselect--active:not(.multiselect--above) .multiselect__current,
	.multiselect--active:not(.multiselect--above) .multiselect__input,
	.multiselect--active:not(.multiselect--above) .multiselect__tags {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.multiselect--active .multiselect__select {
		transform: rotateZ(180deg);
	}

	.multiselect--above.multiselect--active .multiselect__current,
	.multiselect--above.multiselect--active .multiselect__input,
	.multiselect--above.multiselect--active .multiselect__tags {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
	}

	.multiselect__input,
	.multiselect__single {
		position: relative;
		display: inline-block;
		min-height: 20px;
		line-height: 20px;
		border: none;
		border-radius: 5px;
		background: transparent;
		padding: 1px 0 0 5px;
		width: calc(100%);
		transition: border 0.1s ease;
		box-sizing: border-box;
		margin-bottom: 8px;
		vertical-align: top;
	}

	.multiselect__tag ~ .multiselect__input,
	.multiselect__tag ~ .multiselect__single {
		width: auto;
	}

	.multiselect__input:hover,
	.multiselect__single:hover {
		border-color: #cfcfcf;
	}

	.multiselect__input:focus,
	.multiselect__single:focus {
		border-color: #a8a8a8;
		outline: none;
	}

	.multiselect__single {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.multiselect__tags-wrap {
		display: inline
	}

	.multiselect__tags {
		min-height: 40px;
		display: block;
		padding: 8px 40px 0 8px;
		border-radius: 5px;
		border: 1px solid #E8E8E8;
	}

	.multiselect__tag {
		position: relative;
		display: inline-block;
		padding: 4px 26px 4px 10px;
		border-radius: 5px;
		margin-right: 10px;
		color: #fff;
		line-height: 1;
		background: #41B883;
		margin-bottom: 5px;
		white-space: nowrap;
		overflow: hidden;
		max-width: 100%;
		text-overflow: ellipsis;
	}

	.multiselect__tag-icon {
		cursor: pointer;
		margin-left: 7px;
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		font-weight: 700;
		font-style: initial;
		width: 22px;
		text-align: center;
		line-height: 22px;
		transition: all 0.2s ease;
		border-radius: 5px;
	}

	.multiselect__tag-icon:after {
		content: "×";
		color: #266d4d;
		font-size: 14px;
	}

	.multiselect__tag-icon:focus,
	.multiselect__tag-icon:hover {
		background: #369a6e;
	}

	.multiselect__tag-icon:focus:after,
	.multiselect__tag-icon:hover:after {
		color: white;
	}

	.multiselect__current {
		line-height: 16px;
		min-height: 40px;
		box-sizing: border-box;
		display: block;
		overflow: hidden;
		padding: 8px 12px 0;
		padding-right: 30px;
		white-space: nowrap;
		margin: 0;
		text-decoration: none;
		border-radius: 5px;
		border: 1px solid #E8E8E8;
		cursor: pointer;
	}

	.multiselect__select {
		line-height: 16px;
		display: block;
		position: absolute;
		box-sizing: border-box;
		width: 40px;
		height: 38px;
		right: 1px;
		top: 1px;
		padding: 4px 8px;
		margin: 0;
		text-decoration: none;
		text-align: center;
		cursor: pointer;
		transition: transform 0.2s ease;
	}

	.multiselect__select:before {
		position: relative;
		right: 0;
		top: 65%;
		color: #999;
		margin-top: 4px;
		border-style: solid;
		border-width: 5px 5px 0 5px;
		border-color: #999999 transparent transparent transparent;
		content: "";
	}

	.multiselect__placeholder {
		color: #ADADAD;
		display: inline-block;
		margin-bottom: 10px;
		padding-top: 2px;
	}

	.multiselect--active .multiselect__placeholder {
		display: none;
	}

	.multiselect__content-wrapper {
		position: absolute;
		display: block;
		background: #fff;
		width: 100%;
		max-height: 240px;
		overflow: auto;
		border: 1px solid #E8E8E8;
		border-top: none;
		border-bottom-left-radius: 5px;
		border-bottom-right-radius: 5px;
		z-index: 50;
		-webkit-overflow-scrolling: touch;
	}

	.multiselect__content {
		list-style: none;
		display: inline-block;
		padding: 0;
		margin: 0;
		min-width: 100%;
		vertical-align: top;
	}

	.multiselect--above .multiselect__content-wrapper {
		bottom: 100%;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		border-top-left-radius: 5px;
		border-top-right-radius: 5px;
		border-bottom: none;
		border-top: 1px solid #E8E8E8;
	}

	.above {
		bottom: 100%;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		border-bottom: none;
		border-top: 1px solid #E8E8E8;
	}

	.multiselect__content::webkit-scrollbar {
		display: none;
	}

	.multiselect__element {
		display: block;
	}

	.deselect__option {
		display: block;
		padding: 12px;
		min-height: 40px;
		line-height: 16px;
		text-decoration: none;
		text-transform: none;
		vertical-align: middle;
		position: relative;
		cursor: pointer;
		white-space: nowrap;
		opacity: .8;
	}

	.deselect__option:after {
		top: 0;
		right: 0;
		position: absolute;
		line-height: 40px;
		padding-right: 12px;
		padding-left: 20px;
	}

	.deselect__option--highlight {
		background: #41B883;
		outline: none;
		color: white;
	}

	.deselect__option--highlight:after {
		content: attr(data-select);
		background: #41B883;
		color: white;
	}

	.multiselect__option {
		display: block;
		padding: 12px;
		min-height: 40px;
		line-height: 16px;
		text-decoration: none;
		text-transform: none;
		vertical-align: middle;
		position: relative;
		cursor: pointer;
		white-space: nowrap;
	}

	.multiselect__option:after {
		top: 0;
		right: 0;
		position: absolute;
		line-height: 40px;
		padding-right: 12px;
		padding-left: 20px;
	}

	.multiselect__option--highlight {
		background: #41B883;
		outline: none;
		color: white;
	}

	.multiselect__option--highlight:after {
		content: attr(data-select);
		background: #41B883;
		color: white;
	}

	.multiselect__option--selected {
		background: #F3F3F3;
		color: #35495E;
		font-weight: bold;
	}

	.multiselect__option--selected:after {
		content: attr(data-selected);
		color: silver;
	}

	.multiselect__option--selected.multiselect__option--highlight {
		background: #FF6A6A;
		color: #fff;
	}

	.multiselect__option--selected.multiselect__option--highlight:after {
		background: #FF6A6A;
		content: attr(data-deselect);
		color: #fff;
	}

	.multiselect--disabled {
		background: #ededed;
		pointer-events: none;
	}

	.multiselect--disabled .multiselect__current,
	.multiselect--disabled .multiselect__select {
		background: #ededed;
		color: #a6a6a6;
	}

	.multiselect__option--disabled {
		background: #ededed;
		color: #a6a6a6;
		cursor: text;
		pointer-events: none;
	}

	.multiselect__option--disabled.multiselect__option--highlight {
		background: #dedede !important;
	}

	.multiselect-enter-active,
	.multiselect-leave-active {
		transition: all 0.15s ease;
	}

	.multiselect-enter,
	.multiselect-leave-active {
		opacity: 0;
	}

	.multiselect__strong {
		margin-bottom: 10px;
		display: inline-block
	}

	.custom-placeholder:after {
		content: 'Tab \A to select';
		white-space: pre;
		position: absolute;
		top: 0;
		right: 0;
		padding: 5px;
		font-size: 10px;
		text-align: right;
	}

	*[dir="rtl"] .multiselect {
		text-align: right;
	}

	*[dir="rtl"] .multiselect__select {
		right: auto;
		left: 1px;
	}

	*[dir="rtl"] .multiselect__tags {
		padding: 8px 8px 0px 40px;
	}

	*[dir="rtl"] .multiselect__content {
		text-align: right;
	}

	*[dir="rtl"] .multiselect__option:after {
		right: auto;
		left: 0;
	}

	*[dir="rtl"] .multiselect__clear {
		right: auto;
		left: 12px;
	}

	*[dir="rtl"] .multiselect__spinner {
		right: auto;
		left: 1px;
	}

	@keyframes spinning {
		from {
			transform: rotate(0)
		}
		to {
			transform: rotate(2turn)
		}
	}
</style>