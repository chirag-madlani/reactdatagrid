/**
 * Copyright © INOVUA TRADING.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export default (fn: any) => {
  return (event: any) => {
    if (event.key == 'Enter') {
      fn(event);
    }
  };
};
