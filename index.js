let badLetterProbability = 0.3; // Шанс наличия проблем с грузом (неразборчивый адрес, проблемы с упаковкой и т.п.)
let expressDistribution = 0.1; // Количество экспресс грузов (в процентах)
let overSizedPackageDistribution = 0.1; // Количество негабаритных грузов (в процентах)

let packageDistribution = 0.4;

let minuteMultiplier = 1000;
let secondMultiplier = minuteMultiplier / 60;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function addDispersion(n) {
    let doubleN = n * 2;
    let res = Math.random() / (1 / doubleN);
    return res >= n ? res - doubleN : res;
}

class SortingCenter {
    numberOfLettersPerDay = 200; // Количество поступающих грузов в день

    /*workingHours = 24; // Количество часов работы в сутки
    maintenanceTime = 2; // Количество часов, требуемое на техническое обслуживание
    maintenanceTimeDispersion = 0.5; // Разброс количества часов, требуемых на техническое обслуживание
    maintenanceFrequency = 0.5; // Частота технического обслуживания (количество раз в неделю)*/

    numberOfOperators = 10; // Количество операторов
    operatorsOperatingTime = 1; // Время, требуемое на сканирование штрих-кода и регистрацию (в минутах)
    operatorsOperatingTimeDispersion = 0.1; // Разброс времени...
    operatorsSortingTime = 2; // Время, требуемое на определение типа груза и отправку его в определенный цех (в минутах)
    operatorsSortingTimeDispersion = 0.4; // Разброс времени...

    // Цех экспресс доставки
    numberOfExpressOperators = 5; // Количество операторов в цеху экспресс доставки
    expressProcessingTime = 5; // Время, требуемое на обработку груза в цеху экспресс доставки (в минутах)
    expressProcessingTimeDispersion = 1;

    // Цех обработки писем
    numberOfLetterOperators = 2; // Количество операторов в письменном цеху
    operatorsBadLetterProcessingTime = 20; // Время, требуемое на ручную обработку письма (в секундах)
    operatorsBadLetterProcessingTimeDispersion = 5;
    numberOfLettersPerSecond = 6; // Количество писем, проходящих через сканер в секунду
    lettersProcessingTime = 30; // Время, требуемое на проход письма по конвейеру (в секундах)

    /*    // Цех обработки посылок
        numberOfStandardLines = 2; // Число конвейерных лент для обычных грузов
        numberOfOverSizedPackageLines = 1; // Число конвейерных лент для негабаритных грузов
        PackageProcessingTime = 10; // Время прохода посылки по ленте (в минутах)*/

    postProcessingTime = 5; // Время ожидания отправки (в часах)
    postProcessingTimeDispersion = 1;

    sortingCenterQueue = []; // Общая очередь грузов сортировочного центра
    preSortBusyOperators = 0; // Количество загруженных операторов на этапе предварительной сортировке
    scannedLetters = [];

    expressQueue = [];
    expressBusyOperators = 0;

    lettersQueue = [];
    lettersBusyOperators = 0;

    /*    packageQueue = [];
        packageBusyStandard = 0;
        packageBusyOverSized = 0;*/

    waitingQueue = [];

    isWorking;

    processedLetters = [];

    /*    // Статистика
        timeStart;
        timeStop;*/


    async checkQueue() {
        while (this.isWorking) {
            console.log('start', this.sortingCenterQueue.length);
            console.log('scan', this.scannedLetters.length);
            console.log('express', this.expressQueue.length);
            console.log('letters', this.lettersQueue.length);
            console.log('wait', this.waitingQueue.length);
            console.log('fin', this.processedLetters.length);

            if (this.processedLetters.length == this.numberOfLettersPerDay) {
                this.isWorking = false;
                console.log('DONE');
                console.log(this.processedLetters.length);
            }
            await sleep(1000);
        }
    }

    constructor() {
        this.isWorking = false;
    }

    async start() {
        if (!this.isWorking) {
            this.sortingCenterQueue = [];
            this.preSortBusyOperators = 0;
            this.scannedLetters = [];

            this.expressQueue = [];
            this.expressBusyOperators = 0;

            this.lettersQueue = [];
            this.lettersBusyOperators = 0;

            this.waitingQueue = [];
            this.processedLetters = [];

            this.isWorking = true;
            for (let i = 0; i < this.numberOfLettersPerDay; ++i) {
                this.sortingCenterQueue.push(Math.random() <= packageDistribution ? new Package : new Letter);
            }

            this.checkQueue();

            this.processLettersSorting();
            this.processPreSortScanning();
            this.processSorting();
            this.processExpressSorting();
            this.processWaiting();
        } else {
            this.isWorking = false;
            this.processedLetters = [];
        }
        // this.processPackage();
    }

    async processPreSortScanning() {
        let sleepTime = this.operatorsOperatingTime * 5;

        while (this.isWorking) {
            while (this.preSortBusyOperators < this.numberOfOperators && this.sortingCenterQueue.length > 0) {
                this.preSortBusyOperators++;
                let letter = this.sortingCenterQueue.shift();
                letter.scanTimeStart = Date.now();

                this.processPreSortScan().then((response) => {
                    this.preSortBusyOperators--;
                    letter.scanningTime = response;
                    letter.scanTimeEnd = Date.now();
                    this.scannedLetters.push(letter);
                });
            }

            await sleep(sleepTime);
        }
    }

    async processSorting() {
        let sleepTime = this.operatorsOperatingTime;

        while (this.isWorking) {
            while (this.preSortBusyOperators < this.numberOfOperators && this.scannedLetters.length > 0) {
                this.preSortBusyOperators++;
                let letter = this.scannedLetters.shift();
                letter.sortingTimeStart = Date.now();

                this.processSortLetter().then((response) => {
                    this.preSortBusyOperators--;
                    letter.sortingTime = response;

                    letter.sortingTimeEnd = Date.now();

                    if (letter.isExpress) {
                        this.expressQueue.push(letter);
                    }/* else if (letter instanceof Package) {
                        this.packageQueue.push(letter);
                    }*/ else {
                        this.lettersQueue.push(letter);
                    }
                });
            }

            await sleep(sleepTime);
        }
    }

    async processPreSortScan() {
        let processingTime = this.operatorsOperatingTime + addDispersion(this.operatorsOperatingTimeDispersion);
        await sleep(processingTime * minuteMultiplier);
        return processingTime;
    }

    async processSortLetter() {
        let processingTime = this.operatorsSortingTime + addDispersion(this.operatorsSortingTimeDispersion);
        await sleep(processingTime * minuteMultiplier);
        return processingTime;
    }

    async processExpressSorting() {
        let sleepTime = this.expressProcessingTime * 10;

        while (this.isWorking) {
            while (this.expressBusyOperators < this.numberOfExpressOperators && this.expressQueue.length > 0) {
                this.expressBusyOperators++;
                let express = this.expressQueue.shift();
                express.processingTimeStart = Date.now();

                this.processExpress().then((response) => {
                    this.expressBusyOperators--;
                    express.expressTime = response;

                    express.processingTimeEnd = Date.now();
                    express.endTime = Date.now();

                    this.processedLetters.push(express);
                });
            }

            await sleep(sleepTime);
        }
    }

    async processExpress() {
        let processingTime = this.expressProcessingTime + addDispersion(this.expressProcessingTimeDispersion);
        await sleep(processingTime * minuteMultiplier);
        return processingTime;
    }

    async processLettersSorting() {
        let sleepTime = this.lettersProcessingTime * 10;
        let letter;

        while (this.isWorking) {
            while (this.lettersQueue.length > 0) {
                for (let i = 0; i < this.numberOfLettersPerSecond; ++i) {
                    if (this.lettersQueue.length > 0) {
                        letter = this.lettersQueue.shift();
                        letter.processingTimeStart = Date.now();

                        if (letter.isBadLetter) {
                            this.processBadLetter().then((response) => {
                                letter.letterTime = response;
                                letter.letterTime += letter instanceof Package ? this.lettersProcessingTime * 10 : this.lettersProcessingTime;
                                letter.processingTimeEnd = letter instanceof Package ? Date.now() + this.lettersProcessingTime * 10 * secondMultiplier : Date.now() + this.lettersProcessingTime * secondMultiplier;
                                this.waitingQueue.push(letter);
                            });
                        } else {
                            letter.letterTime = 1;
                            letter.letterTime += letter instanceof Package ? this.lettersProcessingTime * 10 : this.lettersProcessingTime;
                            letter.processingTimeEnd = letter instanceof Package ? Date.now() + this.lettersProcessingTime * 10 * secondMultiplier + secondMultiplier : Date.now() + this.lettersProcessingTime * secondMultiplier + secondMultiplier;
                            this.waitingQueue.push(letter);
                        }
                    }
                }

                await sleep(secondMultiplier);
            }

            await sleep(sleepTime);
        }
    }

    async processBadLetter() {
        let processingTime = this.operatorsBadLetterProcessingTime + addDispersion(this.operatorsBadLetterProcessingTimeDispersion);
        while (this.lettersBusyOperators >= this.numberOfLetterOperators) {
        }

        this.lettersBusyOperators++;
        await sleep(processingTime * secondMultiplier);
        this.lettersBusyOperators--;

        return processingTime;
    }

    async processWaiting() {
        let sleepTime = 10;

        let letter;

        while (this.isWorking) {
            while (this.waitingQueue.length > 0) {
                letter = this.waitingQueue.shift();

                letter.timeStopSorting = Date.now();

                letter.waitingTime = this.postProcessingTime + addDispersion(this.postProcessingTimeDispersion);

                letter.endTime = Date.now();
                this.processedLetters.push(letter);
            }

            await sleep(sleepTime);
        }
    }

    /*async processPackage() {
        let sleepTime = 100;

        let letterPackage;

        while (this.isWorking) {
            while (this.packageQueue.length > 0) {
                letterPackage = this.packageQueue.shift();

                if (letterPackage.isOverSized) {
                    this.processOverSized(letterPackage);
                } else {
                    this.processStandard(letterPackage);
                }
            }

            await sleep(sleepTime);
        }
    }

    async processOverSized(pkg) {
        while (this.packageBusyOverSized >= this.numberOfOverSizedPackageLines) {
        }

        this.packageBusyOverSized++;
        await sleep(this.PackageProcessingTime * minuteMultiplier);
        this.packageBusyOverSized--;

        pkg.packageTime = this.PackageProcessingTime;
        pkg.push(this.waitingQueue);
    }

    async processStandard(pkg) {
        while (this.packageBusyStandard >= this.numberOfStandardLines) {
        }

        this.packageBusyStandard++;
        await sleep(this.PackageProcessingTime * minuteMultiplier);
        this.packageBusyStandard--;

        pkg.packageTime = this.PackageProcessingTime;
        pkg.push(this.waitingQueue);
    }*/
}

class Letter {
    isBadLetter;
    isExpress;

    timeToProcess = 0;

    startTime = 0; // Поступил в отдел

    scanTimeStart = 0; // Начали сканирование
    scanTimeEnd = 0; // Закончили сканирование

    sortingTimeStart = 0; // Начали сортировку к зонам
    sortingTimeEnd = 0; // Закончили сортировку к зонам

    processingTimeStart = 0; // Начали специальную сортировку
    processingTimeEnd = 0; // Закончили специальную сортировку

    endTime = 0; // Обработали

    scanningTime = 0; // минуты
    sortingTime = 0; // минуты
    expressTime = 0; // минуты
    letterTime = 0; // секунды
    // packageTime = 0;
    waitingTime = 0; // часы

    constructor() {
        this.isBadLetter = Math.random() <= badLetterProbability;
        this.isExpress = Math.random() <= expressDistribution;

        this.startTime = Date.now();
    }
}

class Package extends Letter {
    isOverSized;

    constructor() {
        super();
        this.isOverSized = Math.random() <= overSizedPackageDistribution;
    }
}

class View {
    container;

    constructor() {
        this.container = document.createElement('div');
        this.container.setAttribute('class', 'container');

        document.body.appendChild(this.container);
    }

    createInputSlider(text, min, max, step, value, id, callback) {
        let element = document.createElement('div');
        element.innerHTML = `<span>${text}</span>
                             <input type="range" min="${min}" max="${max}" value="${value}" id="${id}" class="slider" step="0.1">
                             <input type="text" id="${id}i" value="${value}" class="tinput">`
        this.container.appendChild(element);
        element.setAttribute('class', 'inputs');
        document.getElementById(id + 'i').onchange = () => {
            document.getElementById(id).value = document.getElementById(id + 'i').value;
            callback();
        }

        document.getElementById(id).onchange = () => {
            document.getElementById(id + 'i').value = document.getElementById(id).value;
            callback();
        }
    }
}

let p = document.createElement('span');
p.innerText = 'Основные параметры:';
p.setAttribute('class', 'header');
document.body.appendChild(p);

let sortingCenter = new SortingCenter;
let view = new View;

view.createInputSlider('Количество миллисекунд в минуте (от 1 до 5000)', 1, 5000, 1, 1000, 'ms', () => {
    minuteMultiplier = parseFloat(document.getElementById('ms').value);
});

view.createInputSlider('Количество писем (от 1 до 500)', 1, 500, 1, 200, 'letters', () => {
    sortingCenter.numberOfLettersPerDay = parseFloat(document.getElementById('letters').value);
});

view.createInputSlider('Шанс наличия проблем с грузом (от 0 до 1)', 0, 1, 0.1, 0.3, 'badLetter', () => {
    badLetterProbability = parseFloat(document.getElementById('badLetter').value);
});

view.createInputSlider('Количество экспресс грузов (от 0 до 1)', 0, 1, 0.1, 0.1, 'express', () => {
    expressDistribution = parseFloat(document.getElementById('express').value);
});

view.createInputSlider('Количество негабаритных грузов (от 0 до 1)', 0, 1, 0.1, 0.1, 'overSized', () => {
    overSizedPackageDistribution = parseFloat(document.getElementById('overSized').value);
});

view.createInputSlider('Количество посылок (от 0 до 1)', 0, 1, 0.1, 0.4, 'pkgDstr', () => {
    packageDistribution = parseFloat(document.getElementById('pkgDstr').value);
});

p = document.createElement('span');
p.innerText = 'Параметры отдела первоначальной сортировки:';
p.setAttribute('class', 'header');
document.body.appendChild(p);

view.container = document.createElement('div');
view.container.setAttribute('class', 'container');

document.body.appendChild(view.container);


view.createInputSlider('Количество операторов отдела первоначальной сортировки (от 1 до 15)', 1, 15, 1, 10, 'preProcOp', () => {
    sortingCenter.numberOfOperators = parseFloat(document.getElementById('preProcOp').value);
});

view.createInputSlider('Время, требуемое на сканирование штрих-кода и регистрацию груза (от 0.5 до 5 минут)', 0.5, 5, 0.1, 1, 'preProcTime', () => {
    sortingCenter.operatorsOperatingTime = parseFloat(document.getElementById('preProcTime').value);
});

view.createInputSlider('Разброс времени на сканирование и т.д... (от 0.1 до 0.4 минут)', 0.1, 0.4, 0.1, 0.1, 'preProcTimeD', () => {
    sortingCenter.operatorsOperatingTimeDispersion = parseFloat(document.getElementById('preProcTimeD').value);
});

view.createInputSlider('Время, требуемое на определение типа груза (от 1 до 5 минут)', 1, 5, 0.5, 2, 'preSortTime', () => {
    sortingCenter.operatorsSortingTime = parseFloat(document.getElementById('preSortTime').value);
});

view.createInputSlider('Разброс времени, требуемого на определения типа груза (от 0.2 до 0.9 минут)', 0.2, 0.9, 0.1, 0.4, 'preSortTimeD', () => {
    sortingCenter.operatorsSortingTimeDispersion = parseFloat(document.getElementById('preSortTimeD').value);
});

p = document.createElement('span');
p.innerText = 'Параметры цеха экспресс доставки:';
p.setAttribute('class', 'header');
document.body.appendChild(p);

view.container = document.createElement('div');
view.container.setAttribute('class', 'container');

document.body.appendChild(view.container);

view.createInputSlider('Количество операторов цеха экспресс доставки (от 1 до 5)', 1, 5, 1, 5, 'expressOperators', () => {
    sortingCenter.numberOfExpressOperators = parseFloat(document.getElementById('expressOperators').value);
});

view.createInputSlider('Время, требуемое на обработку груза в цеху экспресс доставки (от 2 до 10 минут)', 2, 10, 1, 5, 'expressTime', () => {
    sortingCenter.expressProcessingTime = parseFloat(document.getElementById('expressTime').value);
});

view.createInputSlider('Разброс времени, требуемого на обработку груза в цеху экспресс доставки (от 0.2 до 1 мин)', 0.2, 1, 0.1, 1, 'expressTimeD', () => {
    sortingCenter.expressProcessingTimeDispersion = parseFloat(document.getElementById('expressTimeD').value);
});

p = document.createElement('span');
p.innerText = 'Параметры цеха обработки писем:';
p.setAttribute('class', 'header');
document.body.appendChild(p);

view.container = document.createElement('div');
view.container.setAttribute('class', 'container');

document.body.appendChild(view.container);

view.createInputSlider('Количество операторов письменного цеха (от 1 до 5)', 1, 5, 1, 2, 'lettersOperators', () => {
    sortingCenter.numberOfLetterOperators = parseFloat(document.getElementById('lettersOperators').value);
});

view.createInputSlider('Время, требуемое на ручную обработку письма (от 5 до 40 секунд)', 5, 40, 1, 20, 'lettersTime', () => {
    sortingCenter.operatorsBadLetterProcessingTime = parseFloat(document.getElementById('lettersTime').value);
});

view.createInputSlider('Разброс времени, требуемого на ручную обработку письма (от 1 до 4 секунд)', 1, 4, 1, 4, 'lettersTimeD', () => {
    sortingCenter.operatorsBadLetterProcessingTimeDispersion = parseFloat(document.getElementById('lettersTimeD').value);
});

view.createInputSlider('Количество писем, проходящих через сканер в секунду (от 1 до 30)', 1, 30, 1, 6, 'lettersFreq', () => {
    sortingCenter.numberOfLettersPerSecond = parseFloat(document.getElementById('lettersFreq').value);
});

view.createInputSlider('Время, требуемое на проход письма по конвейеру (от 20 до 90 секунд)', 20, 90, 1, 30, 'lettersPrTime', () => {
    sortingCenter.lettersProcessingTime = parseFloat(document.getElementById('lettersPrTime').value);
});

p = document.createElement('span');
p.innerText = 'Параметры времени ожидания дальнейшей обработки:';
p.setAttribute('class', 'header');
document.body.appendChild(p);

view.container = document.createElement('div');
view.container.setAttribute('class', 'container');

document.body.appendChild(view.container);

view.createInputSlider('Время ожидания отправки (от 2 до 10 часов', 2, 10, 0.1, 5, 'waitingTime', () => {
    sortingCenter.postProcessingTime = parseFloat(document.getElementById('waitingTime').value);
});

view.createInputSlider('Разброс времени ожидания отправки (от 0.5 до 1 часа)', 0.5, 1, 0.1, 1, 'waitingTimeD', () => {
    sortingCenter.postProcessingTimeDispersion = parseFloat(document.getElementById('waitingTimeD').value);
});

let button = document.createElement('button');
button.setAttribute('class', 'button-three');
button.innerText = 'Начать/прервать симуляцию';
button.setAttribute('style', `left: ${window.innerWidth / 2 - 150}px;`);

document.body.appendChild(button);

button.addEventListener('click', () => {
    sortingCenter.start();

    if (document.getElementById('canvas')) {
        let el = document.getElementById('canvas');
        el.parentNode.removeChild(el);
    }
});

function getFullTime() {
    let res = [];
    sortingCenter.processedLetters.forEach((letter) => {
        res.push((letter.endTime - letter.startTime) / minuteMultiplier);
    });

    return res;
}

function getTimeWithWating() {
    let res = [];
    sortingCenter.processedLetters.forEach((letter) => {
        res.push((letter.endTime - letter.startTime) / minuteMultiplier + (letter.waitingTime * 60));
    });

    return res;
}

function getProcessingTime() {
    let res = [];
    sortingCenter.processedLetters.forEach((letter) => {
        res.push((letter.endTime - letter.scanTimeStart) / minuteMultiplier);
    });

    return res;
}

button = document.createElement('button');
button.setAttribute('class', 'button-three');
button.innerText = 'Показать график с полным временем ожидания';
button.setAttribute('style', `left: ${window.innerWidth / 2 - 150}px;`);

document.body.appendChild(button);

button.addEventListener('click', () => {
    if (document.getElementById('canvas')) {
        let el = document.getElementById('canvas');
        el.parentNode.removeChild(el);
    }

    let canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'canvas');
    canvas.setAttribute('style', 'height: 400px');
    canvas.setAttribute('style', 'width: 400px');
    document.body.appendChild(canvas);
    console.log(getFullTime().length)

    let myChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: getFullTime(),
            datasets: [{
                label: 'Письма',
                data: getFullTime(),
                borderWidth: 1
            }]
        },
        options: {
            title: {
                display: true,
                text: 'Полное время обработки письма в минутах'
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });

});

button = document.createElement('button');
button.setAttribute('class', 'button-three');
button.innerText = 'Показать график с временем ожидания с начала обработки';
button.setAttribute('style', `left: ${window.innerWidth / 2 - 150}px;`);

document.body.appendChild(button);

button.addEventListener('click', () => {
    if (document.getElementById('canvas')) {
        let el = document.getElementById('canvas');
        el.parentNode.removeChild(el);
    }
    let canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'canvas');
    canvas.setAttribute('style', 'height: 400px');
    canvas.setAttribute('style', 'width: 400px');
    document.body.appendChild(canvas);
    console.log(getFullTime().length)

    let myChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: getProcessingTime(),
            datasets: [{
                label: 'Письма',
                data: getProcessingTime(),
                borderWidth: 1
            }]
        },
        options: {
            title: {
                display: true,
                text: 'Время обработки письма, начиная с первого цеха в минутах'
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });

});

function getTimeByTypes() {
    let waitingPreProcessing = 0;
    let scanning = 0;
    let waitingSorting = 0;
    let sorting = 0;
    let waitingProcessing = 0;
    let processing = 0;
    let i = 0;

    sortingCenter.processedLetters.forEach((letter) => {
        waitingPreProcessing += letter.scanTimeStart - letter.startTime;
        scanning += letter.scanTimeEnd - letter.scanTimeStart;
        console.log(letter.scanTimeEnd, letter.scanTimeStart);
        waitingSorting += letter.sortingTimeStart - letter.scanTimeEnd;
        sorting += letter.sortingTimeEnd - letter.sortingTimeStart;
        waitingProcessing += letter.processingTimeStart - letter.sortingTimeEnd;
        processing += letter.processingTimeEnd - letter.processingTimeStart;
        i++;
    });

    waitingPreProcessing = waitingPreProcessing / i / minuteMultiplier;
    scanning = scanning / i / minuteMultiplier;
    waitingSorting =  waitingSorting / i / minuteMultiplier;
    sorting = sorting / i / minuteMultiplier;
    waitingProcessing = waitingProcessing / i / minuteMultiplier;
    processing = processing / i / minuteMultiplier;

    let result = {
        waitingPreProcessing: waitingPreProcessing,
        scanning: scanning,
        waitingSorting: waitingSorting,
        sorting: sorting,
        waitingProcessing: waitingProcessing,
        processing: processing
    }

    console.log(result);

    return result;
}

button = document.createElement('button');
button.setAttribute('class', 'button-three');
button.innerText = 'Показать среднее распределение времени';
button.setAttribute('style', `left: ${window.innerWidth / 2 - 150}px;`);

document.body.appendChild(button);

button.addEventListener('click', () => {
    if (document.getElementById('canvas')) {
        let el = document.getElementById('canvas');
        el.parentNode.removeChild(el);
    }
    let canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'canvas');
    canvas.setAttribute('style', 'height: 400px');
    canvas.setAttribute('style', 'width: 400px');
    document.body.appendChild(canvas);
    console.log(getFullTime().length)

    let myChart = new Chart(canvas, {
        type: 'polarArea',
        data: {
            labels: Object.keys(getTimeByTypes()),
            datasets: [{
                data: Object.values(getTimeByTypes()),
                backgroundColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ]
            }]
        },
        options: {
            title: {
                display: true,
                text: 'Среднее распределение времени в минутах'
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });

});


// sortingCanter.start();
