function convertAssets(id) {
  if (id === 1) {
    return 10000000;
  } else if (id === 2) {
    return 20000000;
  } else if (id === 3) {
    return 40000000;
  } else if (id === 4) {
    return 60000000;
  } else if (id === 5) {
    return 80000000;
  } else if (id === 6) {
    return 100000000;
  }
  return null;
}

function convertCredit(id) {
  if (id === 1) {
    return 5000000;
  } else if (id === 2) {
    return 10000000;
  } else if (id === 3) {
    return 20000000;
  } else if (id === 4) {
    return 30000000;
  } else if (id === 5) {
    return 40000000;
  }
  return null;
}

function convertMonthlySalary(id){
  if(id === 1){
    return 1000000;
  }else if (id === 2){
    return 3000000;
  }else if (id === 3){
    return 5000000;
  }
}

function convertAdditionalIncome(id){
  if(id === 1){
    return 0;
  }else if (id === 2){
    return 1000000;
  }else if (id === 3){
    return 5000000;
  }  else if (id === 4){
    return 9000000;
  }
}

function convertMonthlyIncome(id){
  if(id === 1){
    return 1000000;
  }else if (id === 2){
    return 5000000;
  }else if (id === 3){
    return 10000000;
  }else if (id === 4){
    return 15000000;
  }
}

function convertExpenditure(id){
  if(id === 1){
    return 1000000;
  }else if (id === 2){
    return 5000000;
  }else if (id === 3){
    return 10000000;
  }else if (id === 4){
    return 15000000;
  }
}

module.exports = {
  convertAssets,
  convertCredit,
  convertMonthlyIncome,
  convertExpenditure,
  convertMonthlySalary,
  convertAdditionalIncome,
};
