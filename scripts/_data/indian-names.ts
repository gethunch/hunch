// Curated lists of common Indian first names and surnames, used by
// scripts/seed-history.ts to make seed data feel real.
//
// Mix is roughly representative of urban Indian retail traders — broad
// regional and religious spread, but not a statistical sample. Not auto-
// generated; please review additions for plausibility.

export const FIRST_NAMES: readonly string[] = [
  // Hindi / North + general
  "Aarav", "Aditya", "Akash", "Akshay", "Amit", "Anand", "Aniket", "Anil",
  "Ankit", "Ankur", "Anuj", "Anurag", "Arjun", "Arpit", "Aryan", "Ashish",
  "Atul", "Bhavesh", "Chirag", "Deepak", "Devansh", "Dhruv", "Gaurav",
  "Harsh", "Harshad", "Hemant", "Hitesh", "Ishaan", "Jatin", "Kabir",
  "Karan", "Kartik", "Keshav", "Krishna", "Kunal", "Lakshya", "Madhav",
  "Mahesh", "Manav", "Manish", "Mayank", "Mohit", "Naman", "Neel", "Nikhil",
  "Nilesh", "Nitin", "Om", "Pankaj", "Parth", "Pranav", "Prateek", "Prem",
  "Pulkit", "Raj", "Rajat", "Rajiv", "Rakesh", "Ravi", "Reyansh", "Rishab",
  "Rishi", "Rohan", "Rohit", "Sagar", "Sahil", "Samar", "Sandeep", "Sanjay",
  "Sarthak", "Shashank", "Shaurya", "Shivam", "Shreyas", "Siddharth",
  "Sourav", "Sumit", "Sunil", "Tarun", "Tushar", "Utkarsh", "Vaibhav",
  "Varun", "Vibhav", "Vihaan", "Vijay", "Vikas", "Vikram", "Vinay", "Vinod",
  "Vipul", "Vishal", "Vivek", "Yash", "Yatin",

  // Female (Hindi / North + general)
  "Aanya", "Aaradhya", "Aditi", "Aishwarya", "Akanksha", "Alia", "Ananya",
  "Anika", "Anjali", "Anushka", "Aparna", "Arushi", "Avantika", "Bhavna",
  "Chitra", "Deepika", "Devika", "Diya", "Esha", "Garima", "Geeta", "Gunjan",
  "Heena", "Ishita", "Jaya", "Kavya", "Khushi", "Kiran", "Komal", "Kriti",
  "Lavanya", "Leela", "Mahima", "Manvi", "Meera", "Megha", "Mishti", "Mitali",
  "Mohini", "Naina", "Neha", "Nidhi", "Nikita", "Nisha", "Nupur", "Pari",
  "Pooja", "Prachi", "Pragya", "Preeti", "Priya", "Priyanka", "Radhika",
  "Rashi", "Rhea", "Riddhi", "Riya", "Rohini", "Ruchi", "Saanvi", "Sakshi",
  "Sanika", "Saumya", "Shalini", "Shanaya", "Shreya", "Simran", "Sneha",
  "Sonal", "Sonia", "Suhana", "Swati", "Tanvi", "Tara", "Trisha", "Vani",
  "Vidya", "Vrinda", "Yashika", "Zara",

  // South Indian
  "Adithya", "Anbu", "Arvind", "Bharath", "Dinesh", "Ganesh", "Gokul",
  "Hari", "Kalyan", "Karthik", "Kishore", "Madhavan", "Mahesh", "Murali",
  "Narayan", "Naveen", "Nithin", "Praveen", "Raghav", "Raghu", "Rajesh",
  "Ramesh", "Sanjay", "Senthil", "Srinivas", "Subramanian", "Suresh",
  "Vasanth", "Venkat", "Vignesh",
  "Aishwarya", "Anitha", "Asha", "Bhavana", "Chitra", "Divya", "Geetha",
  "Janani", "Kavitha", "Lakshmi", "Latha", "Madhuri", "Malini", "Meena",
  "Padma", "Parvathi", "Pavithra", "Radha", "Revathi", "Shobha", "Shruti",
  "Sneha", "Sumana", "Sushma", "Swarna", "Vidya",

  // Bengali / East
  "Arnab", "Arpan", "Avijit", "Debasish", "Indrajit", "Joydeep", "Krishanu",
  "Pritam", "Rahul", "Saurav", "Shubham", "Soumya", "Subhash", "Sudipto",
  "Tanmay", "Tirthankar",
  "Ankita", "Antara", "Debjani", "Madhumita", "Moumita", "Paromita", "Piyali",
  "Rituparna", "Shrabani", "Sohini", "Sreelekha", "Tanusree",

  // Muslim (broadly Indian)
  "Aamir", "Adil", "Ahmed", "Akbar", "Ali", "Aman", "Arif", "Asad", "Aslam",
  "Bilal", "Faisal", "Farhan", "Fardeen", "Hamza", "Hassan", "Ibrahim",
  "Imran", "Irfan", "Junaid", "Kamran", "Karim", "Khalid", "Mansoor",
  "Mohammed", "Mubeen", "Naseer", "Nasir", "Nawaz", "Nazim", "Omar", "Qasim",
  "Rafiq", "Raheel", "Rashid", "Rehan", "Saif", "Salman", "Sameer", "Shahid",
  "Shoaib", "Sohail", "Tariq", "Wasim", "Yusuf", "Zaid", "Zahid", "Zeeshan",
  "Aaliyah", "Afreen", "Aisha", "Ayesha", "Fareeda", "Fatima", "Hina",
  "Iqra", "Mehreen", "Nargis", "Nasreen", "Nazia", "Noor", "Rabia", "Rukhsar",
  "Sadia", "Saira", "Sana", "Tabassum", "Zoya",

  // Sikh
  "Amrit", "Arshdeep", "Baljit", "Charanjit", "Dilpreet", "Gagandeep",
  "Gurleen", "Gurpreet", "Harjeet", "Harman", "Harpreet", "Inderjit",
  "Jagjit", "Jaspreet", "Karanveer", "Manjit", "Manpreet", "Navdeep",
  "Navjot", "Paramjit", "Parminder", "Prabhjot", "Ramandeep", "Sandeep",
  "Sarabjit", "Simarpreet", "Sukhbir", "Sukhdeep", "Tarandeep",
  "Amritpal", "Gurnoor", "Harleen", "Jaspreet", "Kiranjit", "Mandeep",
  "Manvir", "Pavneet",

  // Christian (Goan/Anglo/Kerala)
  "Aaron", "Anthony", "Benjamin", "Daniel", "David", "Dominic", "Elias",
  "Glenn", "Joel", "Joseph", "Joshua", "Kevin", "Liam", "Mark", "Michael",
  "Nathan", "Paul", "Peter", "Ronan", "Ryan", "Samuel", "Sebastian", "Simon",
  "Stephen", "Thomas",
  "Aaliyah", "Alisha", "Amelia", "Annabelle", "Christina", "Crystal",
  "Daisy", "Elaine", "Hannah", "Jessica", "Lily", "Maria", "Natalie",
  "Olivia", "Rachel", "Sarah", "Sophia",

  // Parsi
  "Cyrus", "Darius", "Farhad", "Faroukh", "Jamshed", "Khusro", "Minoo",
  "Navroz", "Pesi", "Rustom", "Sohrab", "Zubin",
  "Delna", "Dilshad", "Mehrnaz", "Perizad", "Roshan", "Shirin", "Yasmin",
];

export const SURNAMES: readonly string[] = [
  // Pan-Indian / North
  "Agarwal", "Aggarwal", "Ahuja", "Arora", "Bajaj", "Bansal", "Bhagat",
  "Bhardwaj", "Bhatia", "Bhatt", "Bhattacharya", "Chadha", "Chandra",
  "Chatterjee", "Chauhan", "Chawla", "Chopra", "Dewan", "Dhawan",
  "Dhingra", "Dixit", "Dubey", "Garg", "Goel", "Goyal", "Gupta", "Handa",
  "Jain", "Jha", "Joshi", "Kalra", "Kapoor", "Kashyap", "Khanna", "Khurana",
  "Kohli", "Kumar", "Lal", "Madan", "Mahajan", "Malhotra", "Malik", "Mehra",
  "Mehrotra", "Mehta", "Mishra", "Mittal", "Nagpal", "Nair", "Pandey",
  "Pandit", "Pant", "Parikh", "Patel", "Pathak", "Prasad", "Puri", "Rai",
  "Raj", "Rana", "Rastogi", "Saxena", "Sehgal", "Seth", "Sethi", "Shah",
  "Sharma", "Shukla", "Singh", "Singhal", "Singhania", "Sinha", "Sondhi",
  "Sood", "Suri", "Tandon", "Tewari", "Thakur", "Tiwari", "Trivedi", "Tyagi",
  "Vaidya", "Varma", "Verma", "Vohra", "Wadhwa", "Wahi", "Yadav",

  // Maharashtrian
  "Bhonsle", "Chavan", "Deshmukh", "Deshpande", "Gaikwad", "Gokhale",
  "Joglekar", "Kale", "Kapadia", "Karve", "Kher", "Kulkarni", "Limaye",
  "More", "Patil", "Pawar", "Pendse", "Phadke", "Ranade", "Sane",
  "Sapre", "Shinde", "Tendulkar",

  // Gujarati
  "Acharya", "Bhandari", "Bhanushali", "Desai", "Dholakia", "Ghadiyali",
  "Gohil", "Hingorani", "Joshi", "Kamdar", "Kothari", "Mistry", "Modi",
  "Pancholi", "Panchal", "Parekh", "Patel", "Rajagopal", "Rana", "Sanghvi",
  "Soni", "Thakkar", "Trivedi", "Vora",

  // South Indian (single mononyms common)
  "Aiyer", "Arumugam", "Balasubramanian", "Chari", "Ganapathy", "Iyengar",
  "Iyer", "Krishnan", "Krishnamurthy", "Mahadevan", "Menon", "Nair",
  "Narayanan", "Pillai", "Raghavan", "Raman", "Ramaswamy", "Reddy",
  "Sastry", "Sundaram", "Swaminathan", "Venkatesan", "Venugopal",

  // Bengali
  "Banerjee", "Basu", "Bhattacharjee", "Bose", "Chakraborty", "Chatterjee",
  "Dasgupta", "Dey", "Dutta", "Ganguly", "Ghosh", "Mitra", "Mukherjee",
  "Roy", "Sengupta", "Sen",

  // Punjabi / Sikh
  "Ahluwalia", "Anand", "Bedi", "Bhatti", "Chadha", "Chhabra", "Deol",
  "Dhillon", "Gill", "Grewal", "Kang", "Kaur", "Khalsa", "Lamba", "Mann",
  "Marwaha", "Randhawa", "Sahni", "Sandhu", "Sidhu", "Sodhi",

  // Muslim
  "Abbas", "Ahmed", "Akhtar", "Ali", "Ansari", "Aziz", "Beg", "Hussain",
  "Iqbal", "Ismail", "Kazi", "Khan", "Khwaja", "Mahmood", "Malik",
  "Mansoor", "Memon", "Mirza", "Naqvi", "Nasir", "Pathan", "Qureshi",
  "Rahman", "Raza", "Sayed", "Shaikh", "Sheikh", "Siddiqui", "Sufi", "Syed",
  "Yusuf", "Zaidi",

  // Christian (Anglo / Goan / Kerala)
  "Antony", "Cardozo", "DCosta", "DSouza", "Fernandes", "Gomes", "Jacob",
  "John", "Joseph", "Mathew", "Mathews", "Nazareth", "Pereira", "Pinto",
  "Prince", "Rodrigues", "Sebastian", "Thomas",

  // Parsi
  "Bhandari", "Daruwala", "Dastur", "Engineer", "Irani", "Kapadia",
  "Lawyer", "Mehta", "Mistry", "Sethna", "Wadia",
];
