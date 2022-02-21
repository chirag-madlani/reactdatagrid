/**
 * Copyright © INOVUA TRADING.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const getIndexBy = (data, by, id, getItemId, compoundIdProperty) => {
    let index = -1;
    for (let i = 0, len = data.length; i < len; i++) {
        const item = data[i];
        const itemId = compoundIdProperty ? getItemId(item) : item[by];
        if (itemId === id) {
            // we found our id
            index = i;
            break;
        }
    }
    return index;
};
export default getIndexBy;
