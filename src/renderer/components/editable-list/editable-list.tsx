/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import "./editable-list.scss";

import React from "react";
import { Icon } from "../icon";
import { Input } from "../input";
import { observable } from "mobx";
import { observer } from "mobx-react";
import { autobind } from "../../utils";

export interface Props<T> {
  items: T[],
  add: (newItem: string) => void,
  remove: (info: { oldItem: T, index: number }) => void,
  placeholder?: string,

  // An optional prop used to convert T to a displayable string
  // defaults to `String`
  renderItem?: (item: T, index: number) => React.ReactNode,
}

const defaultProps: Partial<Props<any>> = {
  placeholder: "Add new item...",
  renderItem: (item: any, index: number) => <React.Fragment key={index}>{item}</React.Fragment>
};

@observer
export class EditableList<T> extends React.Component<Props<T>> {
  static defaultProps = defaultProps as Props<any>;
  @observable currentNewItem = "";

  @autobind()
  onSubmit(val: string) {
    const { add } = this.props;

    if (val) {
      add(val);
      this.currentNewItem = "";
    }
  }

  render() {
    const { items, remove, renderItem, placeholder } = this.props;

    return (
      <div className="EditableList">
        <div className="el-header">
          <Input
            theme="round-black"
            value={this.currentNewItem}
            onSubmit={this.onSubmit}
            placeholder={placeholder}
            onChange={val => this.currentNewItem = val}
          />
        </div>
        <div className="el-contents">
          {
            items.map((item, index) => (
              <div key={`${item}${index}`} className="el-item Badge">
                <div>{renderItem(item, index)}</div>
                <div className="el-value-remove">
                  <Icon material="delete_outline" onClick={() => remove(({ index, oldItem: item }))} />
                </div>
              </div>
            ))
          }
        </div>
      </div>
    );
  }
}
