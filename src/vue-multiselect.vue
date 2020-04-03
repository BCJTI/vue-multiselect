<template>
	<div
			:tabindex="disabled || (searchable && isOpen) ? -1 : tabindex"
			:class="[{ 'multiselect--disabled': disabled }, css]"
			:name="name"
			:id="id"
			@click="activate()"
			@keypress="startTyping"
			@keydown.space.enter.prevent="activate()"
			@keydown.self.down.prevent="pointerForward()"
			@keydown.self.up.prevent="pointerBackward()"
			class="multiselect"
	>
		<!--
			Quando corrigir isso, remover o stopPropagation do click
			@blur="searchable ? false : deactivate()"
		-->

		<div ref="tags" class="multiselect__tags">

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

			<span class="multiselect__single" :title="currentOptionLabel || internalPlaceholder">
				<slot v-if="currentOptionLabel" name="singleLabel" :option="currentOptionLabel">
					<template>{{ currentOptionLabel }}</template>
				</slot>
				<template v-else>{{ internalPlaceholder }}</template>
			</span>
		</div>

		<slot name="clear" :search="search"></slot>

		<transition name="multiselect__loading">
			<div>
				<slot name="loading">
					<div v-show="loading" class="multiselect__spinner"></div>
				</slot>
			</div>
		</transition>

		<slot name="carret">
			<div class="multiselect__select"></div>
		</slot>

		<transition name="multiselect">
			<div
					v-if="isOpen"
					class="multiselect__content-wrapper"
					:class="{ above: isAbove }"
					:style="{ width: selectWidth }"
					ref="listWrapper"
					@mousedown.prevent.stop
					@keydown.tab.esc="deactivate()"
					@keydown.down.prevent="pointerForward()"
					@keydown.up.prevent="pointerBackward()"
					@keydown.enter.prevent.stop="addPointerElement($event)"
					@keydown.delete.stop="removeLastElement()"
			>
				<div v-if="searchable" class="multiselect" :class="css">
					<div class="multiselect__tags">
						<input
								ref="search"
								:name="name + '-input'"
								:id="id + '-input'"
								type="text"
								autocomplete="off"
								:placeholder="internalPlaceholder"
								:style="inputStyle"
								v-model="search"
								:disabled="disabled"
								:tabindex="tabindex"
								class="multiselect__input"
						/>
					</div>

					<div v-if="placeholder !== internalPlaceholder" class="custom-placeholder">Tab<br/>to select</div>

					<slot name="carret">
						<div @mousedown.prevent="toggle()" class="multiselect__select open"></div>
					</slot>
				</div>

				<ul
					ref="list"
					class="multiselect__content"
					:class="{ 'full-border': !searchable }"
					:style="{ maxHeight: optimizedHeight + 'px' }"
					@scroll="checkListScroll"
				>
					<slot name="beforeList"></slot>
					<li v-if="multiple && max === internalValue.length">
						<span class="multiselect__option">
							<slot name="maxElements">Maximum of {{ max }} options selected. First remove a selected option to select another.</slot>
						</span>
					</li>
					<template v-else>
						<li class="multiselect__element" v-for="(option, index) of filteredOptions" :key="index" :title="getOptionLabel(option)">
							<span
									v-if="!(option && (option.$isLabel || option.$isDisabled))"
									:class="optionHighlight(index, option)"
									@click.stop="select(option)"
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
			 * css to be aplied in both .multiselect divs
			 * @default ''
			 * @type {String}
			 */
			css: {
				type: String,
				default: '',
			},

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
				default: 40 * 6.5,
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
				internalValue: null,
				contentContainer: null,
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

	};
</script>

<style>

	fieldset[disabled] .multiselect {
		pointer-events: none;
	}

	.multiselect * {
		box-sizing: border-box;
	}

	.multiselect {
		outline: none;
		display: flex;
		align-items: stretch;
		position: relative;
		width: 100%;
		min-height: 40px;
		text-align: left;
		color: #35495E;
		border-radius: 5px;
		border: 1px solid #E8E8E8;
		background-color: #FFFFFF;
	}

	.multiselect > * {
		display: flex;
		align-items: center;
	}

	.multiselect:focus,
	.multiselect__content-wrapper .multiselect {
		border-color: #41B883;
	}

	.multiselect,
	.multiselect__input,
	.multiselect__single {
		font-family: inherit;
		font-size: 14px;
		touch-action: manipulation;
	}

	.multiselect--disabled {
		pointer-events: none;
		opacity: 0.6;
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
		width: 100%;
		transition: border 0.1s ease;
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
		position: relative;
		width: 100%;
		padding: 0 0 0 12px;
		text-overflow: ellipsis;
		overflow: hidden;
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
		flex-shrink: 0;
		cursor: pointer;
		margin: 0;
		padding: 0 12px 0 6px;
		border-radius: 50%;
		line-height: 5px;
		text-decoration: none;
		text-align: center;
	}

	.multiselect__select:before {
		content: '';
		display: inline-block;
		color: #999;
		border-style: solid;
		border-width: 5px 5px 0 5px;
		border-color: #999999 transparent transparent transparent;
		transition: transform 0.2s ease;
	}

	.multiselect__select.open:before {
		transform: rotate(180deg);
	}

	.multiselect__spinner {
		position: relative;
		flex-shrink: 0;
		display: block;
    width: 22px;
    height: 22px;
    margin-left: 6px;
		border-radius: 50%;
	}

	.multiselect__spinner:before,
	.multiselect__spinner:after {
		position: absolute;
		content: '';
		top: 50%;
		left: 50%;
		margin: -8px 0 0 -8px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
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
		position: fixed;
		display: flex;
		flex-direction: column;
		width: 100%;
		z-index: 99999999999;
		-webkit-overflow-scrolling: touch;
	}

	.multiselect__content-wrapper:not(.above) > *:not(:last-child) {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.multiselect__content-wrapper:not(.above) > *:not(:first-child) {
		border-top-width: 0;
		border-top-left-radius: 0;
		border-top-right-radius: 0;
	}

	.multiselect__content-wrapper.above {
		flex-direction: column-reverse;
	}

	.multiselect__content-wrapper.above > *:not(:last-child) {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
	}

	.multiselect__content-wrapper.above > *:not(:first-child) {
		border-bottom-width: 0;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.multiselect__content.full-border {
		border-width: 1px !important;
	}

	.multiselect__content {
		list-style: none;
		display: block;
		padding: 0;
		margin: 0;
		min-width: 100%;
		height: 100%;
		overflow-x: hidden;
		overflow-y: auto;
		border-width: 1px;
		border-radius: 5px;
		border-style: solid;
		border-color: #E8E8E8;
		background-color: #FFFFFF;
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

	.multiselect__option {
		display: block;
		padding: 12px;
		min-height: 40px;
		line-height: 16px;
		text-decoration: none;
		text-transform: none;
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

	.custom-placeholder {
		white-space: pre;
		padding-left: 5px;
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
		padding: 8px 12px 0 35px;
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
		margin-left: 0;
		margin-right: 12px;
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
