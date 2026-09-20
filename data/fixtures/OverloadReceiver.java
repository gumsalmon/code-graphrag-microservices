package org.springframework.samples.petclinic.api.application;

import org.springframework.stereotype.Component;

@Component
public class OverloadReceiver {

    public void doSomething() {
    }

    public void doSomething(String message) {
    }

    public void doSomething(int count) {
    }
}
