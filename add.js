const option1=document.getElementById("option1")
const option2=document.getElementById("option2")
const option3=document.getElementById("option3")
const audio=document.getElementById("wrongAudio")
const correctAudio = document.getElementById("correctAudio");
var answer=0;
function generate_equation(){
     var num1=Math.floor(Math.random() *13);
     var num2=Math.floor(Math.random() *13);
     var dummyAnswer1=Math.floor(Math.random() *13);
     var dummyAnswer2=Math.floor(Math.random() *13);
     var allAnswer=[];
     var switchAnswers=[];
     answer=num1+num2;
     document.getElementById('num1').innerHTML=num1;
     document.getElementById('num2').innerHTML=num2;
     allAnswers =[answer,dummyAnswer1,dummyAnswer2];
     for(i=allAnswers.length;i--;){
      switchAnswers.push(allAnswers.splice(Math.floor(Math.random() * (i+1)) ,1)[0]);
    }
     option1.innerHTML=switchAnswers[0];
     option2.innerHTML=switchAnswers[1];
     option3.innerHTML=switchAnswers[2];

}
function checkAnswer(selectedOption) {
    if (parseInt(selectedOption.innerHTML) === answer) {
        correctAudio.play(); // Play correct answer audio
        generate_equation(); // Generate new equation
    } else {
        wrongAudio.play(); // Play wrong answer audio
    }
}

option1.addEventListener("click", () => checkAnswer(option1));
option2.addEventListener("click", () => checkAnswer(option2));
option3.addEventListener("click", () => checkAnswer(option3));

// Initialize the first equation
generate_equation();

/*option1.addEventListener("click",function(){
    if(option1.innerHTML==answer){
        generate_equation();
    }else{
        audio.play();
    }

});

option2.addEventListener("click",function(){
    if(option2.innerHTML==answer){
        generate_equation();
    }else{
        audio.play();
    }

});

option3.addEventListener("click",function(){
    if(option3.innerHTML==answer){
        generate_equation();
    }else{
        audio.play();
    }

});

generate_equation(); */