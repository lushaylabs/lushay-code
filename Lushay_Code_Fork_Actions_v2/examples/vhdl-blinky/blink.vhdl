library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
use work.counter_pkg.all;

entity Blink_Top is
    port (
        clk : in std_logic;
        led : out std_logic
    );
end entity;

architecture rtl of Blink_Top is
    signal count : unsigned(COUNTER_MSB downto 0) := (others => '0');
begin
    process (clk)
    begin
        if rising_edge(clk) then
            count <= count + 1;
        end if;
    end process;
    led <= count(COUNTER_MSB);
end architecture;
