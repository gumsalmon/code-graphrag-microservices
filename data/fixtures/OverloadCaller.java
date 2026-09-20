package org.springframework.samples.petclinic.api.boundary.web;

import org.springframework.samples.petclinic.api.application.OverloadReceiver;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OverloadCaller {

    private final OverloadReceiver receiver;

    public OverloadCaller(OverloadReceiver receiver) {
        this.receiver = receiver;
    }

    @GetMapping("/test/string")
    public void callWithString() {
        receiver.doSomething("test");
    }

    @GetMapping("/test/empty")
    public void callWithNoArgs() {
        receiver.doSomething();
    }

    @GetMapping("/test/int")
    public void callWithInt() {
        receiver.doSomething(42);
    }
}
