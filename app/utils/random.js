// 배열에서 랜덤 요소 가져오기
exports.getRandomElement = (arr) => {
    return arr[Math.floor(Math.random() * arr.length)];
};

