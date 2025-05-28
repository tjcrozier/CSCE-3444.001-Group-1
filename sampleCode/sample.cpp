#include <iostream>
using namespace std;

// Top-level function
void greet(const string& name) {
    cout << "Hello, " << name << "!" << endl;
}

// A class with member functions
class Calculator {
public:
    Calculator() : memory(0) {}

    int add(int a, int b) {
        memory = a + b;
        return memory;
    }

    int multiply(int a, int b) {
        memory = a * b;
        return memory;
    }


private:
    int memory;

};

// A struct with a method
struct Logger {
    void log(const string& msg) {
        cout << "[LOG] " << msg << endl;
    }
};

int main() {
    greet("Morgan");

    Calculator calc;
    cout << "Sum: " << calc.add(2, 3) << endl;

    Logger logger;
    logger.log("Calculation complete");

    return 0;
}